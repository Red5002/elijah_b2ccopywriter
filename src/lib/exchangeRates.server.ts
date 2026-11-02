import "@tanstack/react-start/server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { ExchangeRateUnavailableError, type ExchangeRateSnapshot } from "./exchangeRateTypes";

export { ExchangeRateUnavailableError };

function getMaxAgeDays(): number {
  const configured = process.env["CBN_RATE_MAX_AGE_DAYS"];
  if (!configured) return 7;
  if (!/^\d+$/.test(configured)) {
    throw new Error("CBN_RATE_MAX_AGE_DAYS must be a positive integer.");
  }
  const days = Number(configured);
  if (!Number.isSafeInteger(days) || days < 1 || days > 365) {
    throw new Error("CBN_RATE_MAX_AGE_DAYS must be between 1 and 365.");
  }
  return days;
}

function dateAgeInDays(effectiveDate: string, now: Date): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) return null;
  const parsedDate = new Date(`${effectiveDate}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== effectiveDate) {
    return null;
  }
  const currentDate = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const rateDate = Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), parsedDate.getUTCDate());
  return Math.floor((currentDate - rateDate) / 86_400_000);
}

export async function getLatestValidExchangeRate(
  supabase: SupabaseClient,
  now = new Date(),
): Promise<ExchangeRateSnapshot> {
  const { data, error } = await supabase
    .from("exchange_rates")
    .select("rate, source, effective_date")
    .eq("base_currency", "USD")
    .eq("quote_currency", "NGN")
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new ExchangeRateUnavailableError();
  if (!data) throw new ExchangeRateUnavailableError();

  const rate = String(data.rate);
  const effectiveDate = String(data.effective_date);
  const age = dateAgeInDays(effectiveDate, now);
  let maxAgeDays: number;
  try {
    maxAgeDays = getMaxAgeDays();
  } catch {
    throw new ExchangeRateUnavailableError(
      "NGN checkout is unavailable because the CBN rate staleness setting is invalid.",
    );
  }
  if (
    data.source !== "CBN NFEM" ||
    !/^\d+(?:\.\d{1,6})?$/.test(rate) ||
    Number(rate) <= 0 ||
    age === null ||
    age < 0 ||
    age > maxAgeDays
  ) {
    throw new ExchangeRateUnavailableError(
      "NGN checkout is unavailable because the latest CBN NFEM rate is invalid or too old.",
    );
  }

  return { rate, source: "CBN NFEM", effectiveDate };
}

export function getNgnRateMaxAgeDays() {
  return getMaxAgeDays();
}
