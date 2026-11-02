import type { OrderFormValues, OrderOfferId } from "@/lib/orders";
import { orderOffers } from "@/lib/orders";
import type { PaymentCurrency } from "@/lib/paymentAmounts";

type OrderSummaryProps = {
  offerId: OrderOfferId;
  values: OrderFormValues;
  amount: string | null;
  currency: PaymentCurrency;
  exchangeRate?: { rate: string; source: string; effectiveDate: string } | null;
};

export function OrderSummary({ offerId, values, amount, currency, exchangeRate }: OrderSummaryProps) {
  const offer = orderOffers[offerId];
  const submittedFields = offer.fields.filter((field) => values[field.name].trim().length > 0);
  const symbol = currency === "USD" ? "$" : "₦";

  return (
    <section className="portfolio-order-summary" aria-labelledby="order-review-heading">
      <h3 id="order-review-heading">{"Review your order"}</h3>
      <div className="portfolio-order-total">
        <span>{offer.name}</span>
        <strong>{amount === null ? "Loading price…" : `${symbol}${amount}`}</strong>
      </div>
      {exchangeRate ? (
        <p className="portfolio-order-payment-note">
          {`${exchangeRate.source} rate: ₦${exchangeRate.rate} per $1, effective ${exchangeRate.effectiveDate}.`}
        </p>
      ) : null}
      <dl>
        {submittedFields.map((field) => (
          <div key={field.name}>
            <dt>{field.label}</dt>
            <dd>{values[field.name]}</dd>
          </div>
        ))}
      </dl>
      <p className="portfolio-order-payment-note">
        {"Payment is processed securely by Paystack after you continue to checkout."}
      </p>
    </section>
  );
}
