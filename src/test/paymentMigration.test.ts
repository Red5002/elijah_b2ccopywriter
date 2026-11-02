import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../supabase/migrations/202611020001_paystack_checkout.sql", import.meta.url),
  "utf8",
);

describe("payment database migration", () => {
  it("restricts order deletion while payment attempts reference the order", () => {
    expect(migration).toMatch(
      /FOREIGN KEY\s*\(order_id\)\s*REFERENCES public\.orders\(id\)\s*ON DELETE RESTRICT/i,
    );
    expect(migration).not.toMatch(/order_id uuid NOT NULL REFERENCES public\.orders\(id\) ON DELETE CASCADE/i);
  });

  it("preserves additional verified charges with a reconciliation status", () => {
    expect(migration).toContain("'duplicate_success'");
    expect(migration).toContain("'reconciliation_required'");
    expect(migration).toMatch(/FOR UPDATE[\s\S]*?v_order_payment_status = 'paid'[\s\S]*?status = 'duplicate_success'/i);
    expect(migration).toMatch(/payments_one_success_per_order[\s\S]*?WHERE status = 'success'/i);
  });

  it("keeps the order transition conditional and forward-only", () => {
    expect(migration).toMatch(
      /project_status = CASE\s+WHEN project_status = 'awaiting_payment' THEN 'queued'\s+ELSE project_status\s+END/i,
    );
    expect(migration).toMatch(/IF v_order_payment_status IS DISTINCT FROM 'paid'/i);
    expect(migration).toMatch(/ON DELETE RESTRICT/i);
  });

  it("records corrections to a CBN NFEM rate without deleting its audit trail", () => {
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.exchange_rate_corrections/i);
    expect(migration).toMatch(/REFERENCES public\.exchange_rates\(id\) ON DELETE RESTRICT/i);
    expect(migration).toMatch(/previous_rate numeric[\s\S]*corrected_rate numeric[\s\S]*correction_reason text/i);
  });
});
