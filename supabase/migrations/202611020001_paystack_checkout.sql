BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS submission_key uuid;

CREATE UNIQUE INDEX IF NOT EXISTS orders_submission_key_unique
  ON public.orders (submission_key)
  WHERE submission_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider = 'paystack'),
  provider_reference text NOT NULL,
  amount numeric(20,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (currency IN ('USD', 'NGN')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'duplicate_success', 'reconciliation_required', 'failed')),
  exchange_rate numeric(14,6),
  exchange_rate_source text,
  exchange_rate_date date,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS exchange_rate numeric(14,6),
  ADD COLUMN IF NOT EXISTS exchange_rate_source text,
  ADD COLUMN IF NOT EXISTS exchange_rate_date date;

DO $$
DECLARE
  v_constraint record;
  v_order_id_attnum smallint;
BEGIN
  SELECT attnum INTO v_order_id_attnum
  FROM pg_attribute
  WHERE attrelid = 'public.payments'::regclass
    AND attname = 'order_id'
    AND NOT attisdropped;

  FOR v_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.payments'::regclass
      AND contype = 'f'
      AND confrelid = 'public.orders'::regclass
      AND v_order_id_attnum = ANY(conkey)
  LOOP
    EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', v_constraint.conname);
  END LOOP;

  ALTER TABLE public.payments
    ADD CONSTRAINT payments_order_id_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE RESTRICT;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.payments
    WHERE order_id IS NULL OR provider_reference IS NULL OR status IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot require payment order, reference, or status fields: incomplete payment attempts exist. Reconcile them before re-running this migration.';
  END IF;
END;
$$;

ALTER TABLE public.payments
  ALTER COLUMN order_id SET NOT NULL,
  ALTER COLUMN provider_reference SET NOT NULL,
  ALTER COLUMN status SET NOT NULL;

DO $$
DECLARE
  v_constraint record;
BEGIN
  FOR v_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.payments'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', v_constraint.conname);
  END LOOP;

  ALTER TABLE public.payments
    ADD CONSTRAINT payments_status_check
    CHECK (status IN ('pending', 'success', 'duplicate_success', 'reconciliation_required', 'failed'));
END;
$$;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.payments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.payments TO service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.payments
    WHERE provider_reference IS NOT NULL
    GROUP BY provider_reference
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Cannot create payments_provider_reference_unique: duplicate payment references exist. Reconcile them before re-running this migration.';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_reference_unique
  ON public.payments (provider_reference)
  WHERE provider_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency text NOT NULL DEFAULT 'USD',
  quote_currency text NOT NULL DEFAULT 'NGN',
  rate numeric(14,6) NOT NULL CHECK (rate > 0),
  source text NOT NULL DEFAULT 'CBN NFEM',
  effective_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL,
  CONSTRAINT exchange_rates_currency_pair_check
    CHECK (base_currency = 'USD' AND quote_currency = 'NGN'),
  CONSTRAINT exchange_rates_source_check
    CHECK (source = 'CBN NFEM')
);

CREATE UNIQUE INDEX IF NOT EXISTS exchange_rates_pair_effective_date_unique
  ON public.exchange_rates (base_currency, quote_currency, effective_date);

CREATE INDEX IF NOT EXISTS exchange_rates_latest_effective_date
  ON public.exchange_rates (effective_date DESC);

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rates FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.exchange_rates FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.exchange_rates TO service_role;

CREATE TABLE IF NOT EXISTS public.exchange_rate_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_rate_id uuid NOT NULL
    REFERENCES public.exchange_rates(id) ON DELETE RESTRICT,
  previous_rate numeric(14,6) NOT NULL,
  corrected_rate numeric(14,6) NOT NULL CHECK (corrected_rate > 0),
  source text NOT NULL CHECK (source = 'CBN NFEM'),
  effective_date date NOT NULL,
  correction_reason text NOT NULL CHECK (length(trim(correction_reason)) > 0),
  corrected_by text NOT NULL CHECK (length(trim(corrected_by)) > 0),
  corrected_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exchange_rate_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_rate_corrections FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.exchange_rate_corrections FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.exchange_rate_corrections TO service_role;

DO $$
BEGIN
  DROP INDEX IF EXISTS public.payments_one_success_per_order;

  WITH ranked_successes AS (
    SELECT id,
      row_number() OVER (PARTITION BY order_id ORDER BY created_at, id) AS success_rank
    FROM public.payments
    WHERE status = 'success'
  )
  UPDATE public.payments AS payment
  SET status = 'duplicate_success'
  FROM ranked_successes
  WHERE payment.id = ranked_successes.id
    AND ranked_successes.success_rank > 1;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS payments_one_success_per_order
  ON public.payments (order_id)
  WHERE status = 'success';

CREATE OR REPLACE FUNCTION public.mark_payment_verified_success(
  p_reference text,
  p_expected_amount numeric,
  p_expected_currency text
)
RETURNS TABLE(payment_status text, order_reference text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_order_reference text;
  v_order_payment_status text;
  v_order_has_success boolean;
BEGIN
  SELECT * INTO v_payment
  FROM public.payments
  WHERE provider = 'paystack'
    AND provider_reference = p_reference
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment attempt not found';
  END IF;

  IF v_payment.amount <> p_expected_amount OR v_payment.currency <> p_expected_currency THEN
    RAISE EXCEPTION 'Verified payment does not match stored amount and currency';
  END IF;

  SELECT o.reference, o.payment_status INTO v_order_reference, v_order_payment_status
  FROM public.orders AS o
  WHERE o.id = v_payment.order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment order not found';
  END IF;

  IF v_payment.status = 'success' THEN
    IF v_order_payment_status IS DISTINCT FROM 'paid' THEN
      UPDATE public.orders
      SET payment_status = 'paid',
          paid_at = COALESCE(paid_at, now()),
          project_status = CASE
            WHEN project_status = 'awaiting_payment' THEN 'queued'
            ELSE project_status
          END
      WHERE id = v_payment.order_id;
    END IF;
    RETURN QUERY SELECT 'success'::text, v_order_reference;
    RETURN;
  ELSIF v_payment.status = 'duplicate_success' THEN
    RETURN QUERY SELECT 'duplicate_success'::text, v_order_reference;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.payments AS existing_payment
    WHERE existing_payment.order_id = v_payment.order_id
      AND existing_payment.status IN ('success', 'duplicate_success')
      AND existing_payment.id <> v_payment.id
  ) INTO v_order_has_success;

  IF v_order_payment_status = 'paid' OR v_order_has_success THEN
    UPDATE public.payments
    SET status = 'duplicate_success', verified_at = COALESCE(verified_at, now())
    WHERE id = v_payment.id;
    RETURN QUERY SELECT 'duplicate_success'::text, v_order_reference;
    RETURN;
  END IF;

  UPDATE public.payments
  SET status = 'success', verified_at = COALESCE(verified_at, now())
  WHERE id = v_payment.id;

  IF v_order_payment_status IS DISTINCT FROM 'paid' THEN
    UPDATE public.orders
    SET payment_status = 'paid',
        paid_at = COALESCE(paid_at, now()),
        project_status = CASE
          WHEN project_status = 'awaiting_payment' THEN 'queued'
          ELSE project_status
        END
    WHERE id = v_payment.order_id;
  END IF;

  RETURN QUERY SELECT 'success'::text, v_order_reference;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_payment_verified_success(text, numeric, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_payment_verified_success(text, numeric, text)
  TO service_role;

COMMIT;
