import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { retryCheckout, verifyCheckout, redirectToPaystack } from "@/lib/payments";

type ReturnState =
  | { status: "loading" }
  | { status: "pending"; orderReference: string }
  | { status: "failed"; orderReference: string }
  | { status: "success"; orderReference: string }
  | {
      status: "duplicate_success";
      orderReference: string;
    }
  | { status: "reconciliation_required"; orderReference: string }
  | {
      status: "retry_confirmation";
      orderReference: string;
      authorizationUrl: string;
      amount: string;
      currency: "USD" | "NGN";
      exchangeRate: { rate: string; source: string; effectiveDate: string } | null;
    }
  | { status: "error"; message: string };

export const Route = createFileRoute("/payment-return")({
  validateSearch: (search: Record<string, unknown>) => ({
    reference: typeof search["reference"] === "string" ? search["reference"] : "",
  }),
  component: PaymentReturn,
});

function PaymentReturn() {
  const { reference } = Route.useSearch();
  const [state, setState] = useState<ReturnState>({ status: "loading" });
  const [retrying, setRetrying] = useState(false);

  const verify = useCallback(async () => {
    if (!reference) {
      setState({ status: "error", message: "The payment reference is missing." });
      return;
    }

    setState({ status: "loading" });
    try {
      const result = await verifyCheckout({ data: { reference } });
      setState({
        status:
          result.status === "success"
            ? "success"
            : result.status === "duplicate_success"
              ? "duplicate_success"
              : result.status === "reconciliation_required"
                ? "reconciliation_required"
                : result.status === "pending"
                  ? "pending"
                  : "failed",
        orderReference: result.orderReference,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : "We couldn't verify the payment. Please retry.",
      });
    }
  }, [reference]);

  useEffect(() => {
    void verify();
  }, [verify]);

  const retry = async () => {
    setRetrying(true);
    try {
      const result = await retryCheckout({ data: { reference } });
      setState({
        status: "retry_confirmation",
        orderReference: result.orderReference,
        authorizationUrl: result.authorizationUrl,
        amount: result.amount,
        currency: result.currency,
        exchangeRate: result.exchangeRate,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : "We couldn't restart checkout. Please try again.",
      });
    } finally {
      setRetrying(false);
    }
  };

  return (
    <main className="payment-return">
      <section className="payment-return-card" aria-live="polite">
        <p className="eyebrow">{"Payment status"}</p>
        {state.status === "loading" ? (
          <h1>{"Verifying your payment…"}</h1>
        ) : state.status === "success" ? (
          <>
            <h1>{"Payment successful"}</h1>
            <p>{`Order reference: ${state.orderReference}`}</p>
            <p>{"Your payment has been verified."}</p>
          </>
        ) : state.status === "duplicate_success" ? (
          <>
            <h1>{"Additional payment recorded"}</h1>
            <p>{`Order reference: ${state.orderReference}`}</p>
            <p>
              {
                "Paystack confirmed an additional charge for this already-paid order. The charge has been recorded for reconciliation; no automatic refund was issued."
              }
            </p>
          </>
        ) : state.status === "retry_confirmation" ? (
          <>
            <h1>{"Confirm payment amount"}</h1>
            <p>{`Order reference: ${state.orderReference}`}</p>
            <p>
              {`The new ${state.currency} payment attempt is ${state.currency === "USD" ? "$" : "₦"}${state.amount}.`}
            </p>
            {state.exchangeRate ? (
              <p>
                {`${state.exchangeRate.source} rate: ₦${state.exchangeRate.rate} per $1, effective ${state.exchangeRate.effectiveDate}.`}
              </p>
            ) : null}
            <p>{"Confirm this amount to continue to secure Paystack checkout."}</p>
            <Button onClick={() => redirectToPaystack(state.authorizationUrl)}>
              {"Confirm amount and continue"}
            </Button>
          </>
        ) : state.status === "reconciliation_required" ? (
          <>
            <h1>{"Payment needs review"}</h1>
            <p>{`Order reference: ${state.orderReference}`}</p>
            <p>
              {
                "Paystack reported a successful charge that does not match the expected order details. We recorded it for reconciliation and did not mark the order paid. Please contact support; do not retry yet."
              }
            </p>
          </>
        ) : state.status === "pending" ? (
          <>
            <h1>{"Payment pending"}</h1>
            <p>{`Order reference: ${state.orderReference}`}</p>
            <p>{"We have not confirmed payment yet. You can check again shortly."}</p>
            <Button onClick={() => void verify()}>{"Check payment status"}</Button>
          </>
        ) : state.status === "failed" ? (
          <>
            <h1>{"Payment failed"}</h1>
            <p>{`Order reference: ${state.orderReference}`}</p>
            <p>{"Your order is still available. You can retry payment securely."}</p>
            <Button disabled={retrying} onClick={() => void retry()}>
              {retrying ? "Starting checkout…" : "Retry payment"}
            </Button>
          </>
        ) : (
          <>
            <h1>{"Unable to verify payment"}</h1>
            <p>{state.message}</p>
            <Button onClick={() => void verify()}>{"Try verification again"}</Button>
          </>
        )}
      </section>
    </main>
  );
}
