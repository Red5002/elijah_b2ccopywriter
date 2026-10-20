import { Button } from "@/components/ui/button";

type FlowFixProps = {
  onSelectOffer: (trigger: HTMLElement) => void;
};

export function FlowFix({ onSelectOffer }: FlowFixProps) {
  return (
    <>
      {" "}
      <div className="pricing-card featured">
        <span className="badge">{"Most Picked"}</span>
        <h3>{"Flow Fix"}</h3>
        <div className="offer-rate">
          <strong>{"$75"}</strong>
          <span>{"/ 48h"}</span>
        </div>
        <p>
          {
            "I rewrite 1 flow: cancel, empty state, or welcome emails. Before/after + React-ready copy you can paste."
          }
        </p>
        <Button
          type="button"
          variant="portfolio"
          className="pricing-cta portfolio-button"
          onClick={(event) => onSelectOffer(event.currentTarget)}
        >
          {"Fix One Flow "}
          <span aria-hidden="true">{"→"}</span>
        </Button>
        <p className="payment-note">
          {"I accept Paystack (card), Wise USD transfer, or bank transfer. No PayPal needed."}
        </p>
      </div>{" "}
    </>
  );
}
