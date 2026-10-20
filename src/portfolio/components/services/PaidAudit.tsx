import { Button } from "@/components/ui/button";

type PaidAuditProps = {
  onSelectOffer: (trigger: HTMLElement) => void;
};

export function PaidAudit({ onSelectOffer }: PaidAuditProps) {
  return (
    <>
      {" "}
      <div className="pricing-card">
        <h3>{"Paid Audit"}</h3>
        <div className="offer-rate">
          <strong>{"$25"}</strong>
          <span>{"/ 24h"}</span>
        </div>
        <p>
          {
            "15-min Loom teardown. I find 3 spots where you lose users — with exact rewrites you can ship today. $25 credited if you book Flow Fix."
          }
        </p>
        <Button
          type="button"
          variant="portfolio"
          className="pricing-cta portfolio-button"
          onClick={(event) => onSelectOffer(event.currentTarget)}
        >
          {"Get Audit "}
          <span aria-hidden="true">{"→"}</span>
        </Button>
        <p className="payment-note">
          {"I accept Paystack (card), Wise USD transfer, or bank transfer. No PayPal needed."}
        </p>
      </div>{" "}
    </>
  );
}
