import { useEffect, useState, type RefObject } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, LoaderCircle } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
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
import { submitMockOrder } from "@/lib/submitOrder";
import { OrderForm } from "./OrderForm";
import { OrderSummary } from "./OrderSummary";

type OrderStatus = "idle" | "validation-error" | "submitting" | "success" | "failure";
type OrderStep = "details" | "review";

type OrderModalProps = {
  offerId: OrderOfferId | null;
  onClose: () => void;
  triggerRef: RefObject<HTMLElement | null>;
};

export function OrderModal({ offerId, onClose, triggerRef }: OrderModalProps) {
  const [step, setStep] = useState<OrderStep>("details");
  const [status, setStatus] = useState<OrderStatus>("idle");
  const [failureMessage, setFailureMessage] = useState("");
  const [confirmationId, setConfirmationId] = useState("");
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
    reset(emptyOrderValues);
    setStep("details");
    setStatus("idle");
    setFailureMessage("");
    setConfirmationId("");
  }, [offerId, reset]);

  const requestClose = () => {
    if (status !== "success" && isDirty && !window.confirm("Discard the details entered so far?")) {
      return;
    }
    reset(emptyOrderValues);
    onClose();
  };

  const createOrder = async (orderValues: OrderFormValues) => {
    if (!offerId) return;
    setStatus("submitting");
    setFailureMessage("");
    try {
      const result = await submitMockOrder({ offer: offerId, values: orderValues });
      setConfirmationId(result.confirmationId);
      setStatus("success");
    } catch (error) {
      setFailureMessage(
        error instanceof Error
          ? error.message
          : "We couldn't create the test order. Please try again.",
      );
      setStatus("failure");
    }
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
              <p className="eyebrow">{"Prototype order"}</p>
              <DialogTitle>{`${offer.name} · $${offer.price}`}</DialogTitle>
              <DialogDescription id="portfolio-order-description">
                {status === "success"
                  ? "Your test order is confirmed. No real order or payment was created."
                  : step === "details"
                    ? "Tell me about your product so I can tailor this offer."
                    : "Check the details before confirming this test order."}
              </DialogDescription>
            </DialogHeader>

            <p className="portfolio-order-warning" role="note">
              {
                "Prototype only — do not enter real client or sensitive information. No payment is processed."
              }
            </p>

            {status === "success" ? (
              <div className="portfolio-order-success" role="status" aria-live="polite">
                <span className="portfolio-order-success-icon" aria-hidden="true">
                  <Check />
                </span>
                <h3>{"Test order confirmed"}</h3>
                <p>{`Confirmation: ${confirmationId}`}</p>
                <DialogClose asChild>
                  <Button variant="portfolio" className="btn btn-primary portfolio-order-action">
                    {"Done"}
                  </Button>
                </DialogClose>
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
                    setStep("review");
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
                <OrderSummary offerId={offerId} values={values} />
                <div className="portfolio-order-actions">
                  <Button
                    variant="portfolio"
                    className="btn portfolio-order-action"
                    type="button"
                    disabled={status === "submitting"}
                    onClick={() => {
                      setStatus("idle");
                      setStep("details");
                    }}
                  >
                    {"Back to details"}
                  </Button>
                  <Button
                    variant="portfolio"
                    className="btn btn-primary portfolio-order-action"
                    type="button"
                    disabled={status === "submitting"}
                    onClick={() => void createOrder(values)}
                  >
                    {status === "submitting" ? (
                      <>
                        <LoaderCircle className="portfolio-order-spinner" aria-hidden="true" />
                        {"Creating test order…"}
                      </>
                    ) : status === "failure" ? (
                      "Retry test order"
                    ) : (
                      "Confirm test order"
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
