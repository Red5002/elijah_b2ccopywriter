import { Button } from "@/components/ui/button";

type ActivationRewriteProps = {
  onSelectOffer: (trigger: HTMLElement) => void;
};

export function ActivationRewrite({ onSelectOffer }: ActivationRewriteProps) {
  return (
    <>
      {" "}
      <div className="pricing-card">
        <h3>{"Activation Rewrite"}</h3>
        <div className="offer-rate">
          <strong>{"$195"}</strong>
          <span>{"/ 3 days"}</span>
        </div>
        <p>
          {
            "Hero + empty state + welcome email. The 3 screens that decide if sign-ups become paying users."
          }
        </p>
        <Button
          type="button"
          variant="portfolio"
          className="pricing-cta portfolio-button"
          onClick={(event) => onSelectOffer(event.currentTarget)}
        >
          {"Fix My Activation "}
          <span aria-hidden="true">{"→"}</span>
        </Button>
        <p className="payment-note">
          {"I accept Paystack (card), Wise USD transfer, or bank transfer. No PayPal needed."}
        </p>
      </div>{" "}
    </>
  );
}
