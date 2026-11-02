import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

export function validateRateInput(rate, effectiveDate, now = new Date()) {
  if (!/^\d+(?:\.\d{1,6})?$/.test(rate ?? "") || !Number.isFinite(Number(rate)) || Number(rate) <= 0) {
    return { error: "Supply a positive USD/NGN rate with no more than six decimal places." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate ?? "")) {
    return { error: "Supply the CBN effective date in YYYY-MM-DD format." };
  }

  const parsedDate = new Date(`${effectiveDate}T00:00:00.000Z`);
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== effectiveDate ||
    parsedDate > today
  ) {
    return { error: "The effective date must be a valid date no later than today (UTC)." };
  }

  return { rate, effectiveDate };
}

export function rateInsertErrorMessage(error) {
  if (error && typeof error === "object" && Reflect.get(error, "code") === "23505") {
    return "A rate is already recorded for that effective date. Use the documented audited correction procedure if it needs correction.";
  }
  return "Unable to store the rate. Check the Supabase connection and operator permissions.";
}

async function main() {
  const [rate, effectiveDate] = process.argv.slice(2);
  const validation = validateRateInput(rate, effectiveDate);
  if ("error" in validation) {
    console.error(validation.error);
    process.exitCode = 1;
    return;
  }

  const supabaseUrl = process.env["VITE_SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the trusted operator environment.",
    );
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await supabase.from("exchange_rates").insert({
    base_currency: "USD",
    quote_currency: "NGN",
    rate: validation.rate,
    source: "CBN NFEM",
    effective_date: validation.effectiveDate,
  });

  if (error) {
    console.error(rateInsertErrorMessage(error));
    process.exitCode = 1;
  } else {
    console.info(
      `Recorded the operator-submitted USD/NGN rate for ${validation.effectiveDate}.`,
    );
  }
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  await main();
}
