import { useEffect, useRef, useState, type RefObject } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  emptyOrderValues,
  orderOffers,
  orderSchemas,
  type OrderFormValues,
  type OrderOfferId,
} from "@/lib/orders";
import type { CreatedOrder } from "@/lib/orderSubmission";
import type { PaymentCurrency } from "@/lib/paymentAmounts";
import type { PaymentQuote } from "@/lib/paymentFlow";
import { submitOrder } from "@/lib/submitOrder";
import {
  getCheckoutQuote,
  initializeCheckout,
  redirectToPaystack,
} from "@/lib/payments";
import { OrderForm } from "./OrderForm";
import { OrderSummary } from "./OrderSummary";

type OrderStatus =
  | "idle"
  | "validation-error"
  | "submitting"
  | "amount-confirmation"
  | "redirecting"
  | "failure";
type OrderStep = "details" | "review";
type PendingCheckout = { authorizationUrl: string };

type OrderModalProps = {
  offerId: OrderOfferId | null;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
};

export function OrderModal({ offerId, onClose, triggerRef }: OrderModalProps) {
  const [step, setStep] = useState<OrderStep>("details");
  const [status, setStatus] = useState<OrderStatus>("idle");
  const [failureMessage, setFailureMessage] = useState("");
  const [quoteError, setQuoteError] = useState("");
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [currency, setCurrency] = useState<PaymentCurrency>("USD");
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const submissionInProgress = useRef(false);
  const submissionKey = useRef<string | null>(null);
  const quoteRequestId = useRef(0);
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchemas[offerId ?? "paid-audit"]),
    defaultValues: emptyOrderValues,
  });
  const { isDirty } = form.formState;
  const { reset } = form;
  const values = form.watch();
  const offer = offerId ? orderOffers[offerId] : null;

  useEffect(() => {
    if (!offerId) return;
    quoteRequestId.current += 1;
    reset(emptyOrderValues);
    setStep("details");
    setStatus("idle");
    setFailureMessage("");
    setQuoteError("");
    setQuote(null);
    setCurrency("USD");
    setCreatedOrder(null);
    setPendingCheckout(null);
    submissionKey.current = null;
  }, [offerId, reset]);

  const requestClose = () => {
    if (status === "submitting" || status === "redirecting") return;
    if (isDirty && !window.confirm("Discard the details entered so far?")) {
      return;
    }
    reset(emptyOrderValues);
    onClose();
  };

  const startCheckout = async (orderValues: OrderFormValues) => {
    if (!offerId || submissionInProgress.current) return;
    submissionInProgress.current = true;
    setPendingCheckout(null);
    setStatus("submitting");
    setFailureMessage("");
    try {
      if (
        import.meta.env.DEV &&
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("mockOrderFailure") === "1"
      ) {
        throw new Error("This simulated request failed. No order was created. Please try again.");
      }

      if (!submissionKey.current) submissionKey.current = crypto.randomUUID();
      const currentSubmissionKey = submissionKey.current;
      const order =
        createdOrder ??
        (await submitOrder({
          data: { serviceId: offerId, submissionKey: currentSubmissionKey, values: orderValues },
        }));
      if (!createdOrder) setCreatedOrder(order);

      const payment = await initializeCheckout({
        data: { orderId: order.id, submissionKey: currentSubmissionKey, currency },
      });

      const displayedAmount =
        currency === "USD"
          ? quote?.usdAmount
          : quote?.ngn.available
            ? quote.ngn.amount
            : null;
      const rateChanged =
        currency === "NGN" &&
        (!quote?.ngn.available ||
          !payment.exchangeRate ||
          quote.ngn.rate !== payment.exchangeRate.rate ||
          quote.ngn.source !== payment.exchangeRate.source ||
          quote.ngn.effectiveDate !== payment.exchangeRate.effectiveDate);
      if (payment.amount !== displayedAmount || rateChanged) {
        if (currency === "USD") {
          setQuote((current) =>
            current ? { ...current, usdAmount: payment.amount } : current,
          );
        } else if (payment.exchangeRate && quote) {
          setQuote({
            ...quote,
            ngn: {
              available: true,
              amount: payment.amount,
              ...payment.exchangeRate,
            },
          });
        } else {
          throw new Error("The current NGN rate could not be confirmed. Please retry.");
        }
        setPendingCheckout({ authorizationUrl: payment.authorizationUrl });
        setStatus("amount-confirmation");
        return;
      }

      setStatus("redirecting");
      redirectToPaystack(payment.authorizationUrl);
    } catch (error) {
      setFailureMessage(
        error instanceof Error ? error.message : "We couldn't start checkout. Please try again.",
      );
      setStatus("failure");
    } finally {
      submissionInProgress.current = false;
    }
  };

  const confirmAmountAndContinue = () => {
    if (!pendingCheckout) return;
    setStatus("redirecting");
    redirectToPaystack(pendingCheckout.authorizationUrl);
  };

  return (
    <Dialog
      open={offer !== null}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) requestClose();
      }}
    >
      {offer ? (
        <FormProvider {...form}>
          <DialogContent
            className="portfolio-order-dialog"
            aria-describedby="portfolio-order-description"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              triggerRef.current?.focus({ preventScroll: true });
            }}
          >
            <DialogHeader className="portfolio-order-header">
              <p className="eyebrow">{"Order request"}</p>
              <DialogTitle>{`${offer.name} · $${offer.price}`}</DialogTitle>
              <DialogDescription id="portfolio-order-description">
                {step === "details"
                  ? "Tell me about your product so I can tailor this offer."
                  : status === "redirecting"
                    ? "Redirecting to secure Paystack checkout…"
                    : status === "amount-confirmation"
                      ? "Confirm the current amount before continuing to secure checkout."
                    : "Review your order and choose a payment currency."}
              </DialogDescription>
            </DialogHeader>

            <p className="portfolio-order-warning" role="note">
              {"Your payment is not complete until Paystack confirms it and the return page verifies it."}
            </p>

            {status === "redirecting" ? (
              <div className="portfolio-order-success" role="status" aria-live="polite">
                <span className="portfolio-order-success-icon" aria-hidden="true">
                  <LoaderCircle className="portfolio-order-spinner" />
                </span>
                <h3>{"Opening secure checkout"}</h3>
                <p>{"You will return here after Paystack processes your payment."}</p>
              </div>
            ) : step === "details" ? (
              <>
                {status === "validation-error" ? (
                  <p className="portfolio-order-status" role="alert">
                    {
                      "Please check the highlighted fields and correct the details before continuing."
                    }
                  </p>
                ) : null}
                <OrderForm
                  fields={offer.fields}
                  onContinue={(orderValues) => {
                    reset(orderValues, { keepDirty: true });
                    setStatus("idle");
                    setQuoteError("");
                    setQuote(null);
                    setStep("review");
                    const requestId = ++quoteRequestId.current;
                    void getCheckoutQuote({ data: { serviceId: offerId } })
                      .then((nextQuote) => {
                        if (requestId === quoteRequestId.current) setQuote(nextQuote);
                      })
                      .catch((error: unknown) => {
                        if (requestId !== quoteRequestId.current) return;
                        setQuoteError(
                          error instanceof Error
                            ? error.message
                            : "Unable to load current service pricing.",
                        );
                      });
                  }}
                  onValidationError={() => setStatus("validation-error")}
                />
              </>
            ) : (
              <>
                {status === "failure" ? (
                  <p className="portfolio-order-status" role="alert">
                    {failureMessage}
                  </p>
                ) : null}
                {status === "amount-confirmation" ? (
                  <p className="portfolio-order-status" role="alert">
                    {
                      "The service price or CBN NFEM rate changed since you reviewed the quote. Confirm the updated amount below before continuing."
                    }
                  </p>
                ) : null}
                {quoteError ? (
                  <p className="portfolio-order-status" role="alert">
                    {quoteError}
                  </p>
                ) : null}
                <OrderSummary
                  offerId={offerId}
                  values={values}
                  amount={
                    quote === null
                      ? null
                      : currency === "USD"
                        ? quote.usdAmount
                        : quote.ngn.available
                          ? quote.ngn.amount
                          : null
                  }
                  currency={currency}
                  exchangeRate={currency === "NGN" && quote?.ngn.available ? quote.ngn : null}
                />
                <div className="portfolio-order-currency">
                  <label htmlFor="order-currency">{"Payment currency"}</label>
                  <select
                    id="order-currency"
                    value={currency}
                    disabled={status === "amount-confirmation"}
                    onChange={(event) =>
                      setCurrency(event.target.value === "NGN" ? "NGN" : "USD")
                    }
                  >
                    <option value="USD">{"USD ($)"}</option>
                    <option value="NGN" disabled={!quote?.ngn.available}>
                      {quote?.ngn.available
                        ? "NGN (₦)"
                        : "NGN (₦) — unavailable until a current CBN NFEM rate is recorded"}
                    </option>
                  </select>
                </div>
                {quote?.ngn.available === false ? (
                  <p className="portfolio-order-help" role="note">
                    {quote.ngn.reason}
                  </p>
                ) : null}
                {createdOrder ? (
                  <p className="portfolio-order-help">
                    {`Order reference: ${createdOrder.reference}. Payment retries will use this order.`}
                  </p>
                ) : null}
                <div className="portfolio-order-actions">
                  <Button
                    variant="portfolio"
                    className="btn portfolio-order-action"
                    type="button"
                    disabled={status === "submitting" || createdOrder !== null}
                    onClick={() => {
                      setStatus("idle");
                      setPendingCheckout(null);
                      setStep("details");
                    }}
                  >
                    {"Back to details"}
                  </Button>
                  <Button
                    variant="portfolio"
                    className="btn btn-primary portfolio-order-action"
                    type="button"
                    disabled={
                      status === "submitting" ||
                      status === "redirecting" ||
                      (status === "amount-confirmation" && !pendingCheckout) ||
                      quote === null ||
                      (currency === "NGN" && !quote.ngn.available)
                    }
                    onClick={() =>
                      status === "amount-confirmation"
                        ? confirmAmountAndContinue()
                        : void startCheckout(values)
                    }
                  >
                    {status === "submitting" ? (
                      <>
                        <LoaderCircle className="portfolio-order-spinner" aria-hidden="true" />
                        {"Creating order…"}
                      </>
                    ) : status === "failure" ? (
                      createdOrder ? "Retry payment" : "Retry checkout"
                    ) : status === "amount-confirmation" ? (
                      "Confirm amount and continue"
                    ) : (
                      "Continue to payment"
                    )}
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </FormProvider>
      ) : null}
    </Dialog>
  );
}
