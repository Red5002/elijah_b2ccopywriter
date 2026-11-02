# Paystack and exchange-rate operations

## Required server environment

Set these variables in the trusted server environment (`.dev.vars` for local
development and the deployment platform's secret configuration for production):

- `SUPABASE_SERVICE_ROLE_KEY`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_CALLBACK_URL` (absolute URL for `/payment-return`, e.g.
  `https://example.com/payment-return`)
- `CBN_RATE_MAX_AGE_DAYS` (optional; positive integer, defaults to `7`)

Keep `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in public
configuration. Never prefix either server secret with `VITE_`, commit `.dev.vars`,
or expose service-role/Paystack credentials to browser code.

Configure the Paystack webhook URL to
`https://<site-host>/api/paystack/webhook`. The application validates the
Paystack HMAC-SHA512 signature and independently verifies each transaction with
Paystack before changing order payment state.

## Apply the database migration

Review and apply `supabase/migrations/202611020001_paystack_checkout.sql` to
each Supabase environment. The migration adds order submission idempotency,
payment rate snapshots, restrictive order deletion, the historical
exchange-rate and correction-audit tables, and an atomic verified-payment RPC.
It preserves one canonical successful payment per order and classifies any
additional already-successful attempts as `duplicate_success` so they remain
available for reconciliation without changing the order's paid state.

The migration intentionally provides no public or authenticated-user
write policy for `exchange_rates`. The service-role key bypasses RLS and must
only be used by trusted server code or the operator procedure below.

## Record a CBN NFEM rate

1. An authorized operator obtains the latest published CBN NFEM
   volume-weighted average USD/NGN rate and confirms its effective date. The
   script records the operator-submitted value; it does not independently
   retrieve or verify a CBN publication.
2. In a trusted local shell, set `VITE_SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY` from the protected environment. For local
   development, Node can read the ignored `.dev.vars` file without printing it:

   ```sh
   node --env-file=.env.local --env-file=.dev.vars scripts/set-cbn-nfem-rate.mjs 1500.000000 2026-11-02
   ```

   Use the verified rate and date, not the illustrative values above.
3. The script inserts a historical row with source `CBN NFEM`. It does not
   update or overwrite an existing date. A duplicate date is rejected.
4. Verify the new row through the trusted Supabase dashboard or SQL editor:

   ```sql
   SELECT base_currency, quote_currency, rate, source, effective_date
   FROM public.exchange_rates
   ORDER BY effective_date DESC
   LIMIT 1;
   ```

### Correcting a recorded rate

Do not delete or silently overwrite an existing rate. An authorized database
operator should use the Supabase SQL editor to record the old and corrected
values in `exchange_rate_corrections` and update the rate in one transaction.
Replace the example literals with the verified rate, reason, and operator
identity:

```sql
BEGIN;

DO $$
DECLARE
  current_rate public.exchange_rates%ROWTYPE;
BEGIN
  SELECT * INTO STRICT current_rate
  FROM public.exchange_rates
  WHERE base_currency = 'USD'
    AND quote_currency = 'NGN'
    AND effective_date = DATE '2026-11-02'
  FOR UPDATE;

  INSERT INTO public.exchange_rate_corrections (
    exchange_rate_id,
    previous_rate,
    corrected_rate,
    source,
    effective_date,
    correction_reason,
    corrected_by
  ) VALUES (
    current_rate.id,
    current_rate.rate,
    1501.250000,
    current_rate.source,
    current_rate.effective_date,
    'Corrected to match the verified CBN publication.',
    'operator@example.com'
  );

  UPDATE public.exchange_rates
  SET rate = 1501.250000, updated_at = now()
  WHERE id = current_rate.id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The rate row disappeared during correction.';
  END IF;
END;
$$;

COMMIT;
```

`SELECT ... INTO STRICT` aborts if the effective-date row is missing or
ambiguous. The transaction writes the correction audit row before updating
the current value; any failure rolls both changes back.

The script is a trusted operator command, not a public server endpoint or
browser admin form. Its authorization is possession of the protected
service-role credential and access to the trusted operator environment. Do not
run it on a machine or in a CI job that is not authorized to manage rates.

NGN checkout remains disabled when there is no rate, the effective date is in
the future, or the rate exceeds the configured staleness window. USD checkout
does not depend on exchange-rate availability.
