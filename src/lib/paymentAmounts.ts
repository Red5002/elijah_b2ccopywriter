import { z } from "zod";

export const paymentCurrencySchema = z.enum(["USD", "NGN"]);
export type PaymentCurrency = z.infer<typeof paymentCurrencySchema>;

const scaledInteger = (value: string | number, scale: number): bigint => {
  const text = String(value).trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(text);
  if (!match) throw new Error("The service price or exchange rate is invalid.");

  const whole = match[1] ?? "0";
  const fraction = match[2] ?? "";
  if (fraction.length > scale && /[1-9]/.test(fraction.slice(scale))) {
    throw new Error("The service price or exchange rate has unsupported precision.");
  }
  return BigInt(whole) * 10n ** BigInt(scale) +
    BigInt(fraction.slice(0, scale).padEnd(scale, "0") || "0");
};

export function usdPriceToCents(price: string | number): bigint {
  const cents = scaledInteger(price, 2);
  if (cents <= 0n) throw new Error("The service price must be greater than zero.");
  return cents;
}

export function exchangeRateToMicros(rate: string | number): bigint {
  const micros = scaledInteger(rate, 6);
  if (micros <= 0n) throw new Error("The exchange rate must be greater than zero.");
  return micros;
}

export function usdCentsToNgnKobo(usdCents: bigint, rateMicros: bigint): bigint {
  return (usdCents * rateMicros + 500_000n) / 1_000_000n;
}

export function toSafeMinorUnitNumber(amount: bigint): number {
  if (amount <= 0n || amount > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("The calculated payment amount is outside the supported range.");
  }
  return Number(amount);
}

export function formatMinorUnitAmount(amount: bigint): string {
  const whole = amount / 100n;
  const fraction = String(amount % 100n).padStart(2, "0");
  return `${whole}.${fraction}`;
}

export function paymentAmountFromPrice(
  price: string | number,
  currency: PaymentCurrency,
  rate?: string | number,
): { minorUnits: bigint; amount: string } {
  const usdCents = usdPriceToCents(price);
  const minorUnits =
    currency === "USD"
      ? usdCents
      : rate === undefined
        ? (() => {
            throw new Error("NGN checkout is unavailable without a current CBN NFEM rate.");
          })()
        : usdCentsToNgnKobo(usdCents, exchangeRateToMicros(rate));
  return { minorUnits, amount: formatMinorUnitAmount(minorUnits) };
}
