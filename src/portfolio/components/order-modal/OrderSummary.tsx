import type { OrderFormValues, OrderOfferId } from "@/lib/orders";
import { orderOffers } from "@/lib/orders";

type OrderSummaryProps = {
  offerId: OrderOfferId;
  values: OrderFormValues;
};

export function OrderSummary({ offerId, values }: OrderSummaryProps) {
  const offer = orderOffers[offerId];
  const submittedFields = offer.fields.filter((field) => values[field.name].trim().length > 0);

  return (
    <section className="portfolio-order-summary" aria-labelledby="order-review-heading">
      <h3 id="order-review-heading">{"Review your order"}</h3>
      <div className="portfolio-order-total">
        <span>{offer.name}</span>
        <strong>{`$${offer.price}`}</strong>
      </div>
      <dl>
        {submittedFields.map((field) => (
          <div key={field.name}>
            <dt>{field.label}</dt>
            <dd>{values[field.name]}</dd>
          </div>
        ))}
      </dl>
      <p className="portfolio-order-payment-note">
        {"Payment is a placeholder in this prototype. No payment will be taken."}
      </p>
    </section>
  );
}
