import { createServerFn } from "@tanstack/react-start";
import {
  initializePaymentInputSchema,
  paymentQuoteInputSchema,
  retryPaymentInputSchema,
  verifyPaymentInputSchema,
} from "./paymentFlow";

export const getCheckoutQuote = createServerFn({ method: "GET" })
  .validator((input) => paymentQuoteInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { getServerPaymentQuote } = await import("./payment.server");
    return getServerPaymentQuote(data.serviceId);
  });

export const initializeCheckout = createServerFn({ method: "POST" })
  .validator((input) => initializePaymentInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { initializeServerPayment } = await import("./payment.server");
    return initializeServerPayment(data);
  });

export const verifyCheckout = createServerFn({ method: "POST" })
  .validator((input) => verifyPaymentInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { verifyServerPayment } = await import("./paymentVerification.server");
    return verifyServerPayment(data.reference);
  });

export const retryCheckout = createServerFn({ method: "POST" })
  .validator((input) => retryPaymentInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { retryServerPayment } = await import("./payment.server");
    return retryServerPayment(data);
  });

export function redirectToPaystack(authorizationUrl: string) {
  window.location.assign(authorizationUrl);
}
