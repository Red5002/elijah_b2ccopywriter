import { z } from "zod";
import { usdPriceToCents } from "./paymentAmounts";

export const paymentReferenceSchema = z
  .string()
  .regex(/^pay_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

export type StoredPaymentAttempt = {
  id: string;
  order_id: string;
  provider_reference: string;
  amount: string | number;
  currency: string;
  status: string;
};

export type PaymentOrderDetails = {
  id: string;
  reference: string;
  customer_email: string;
};

export type VerifiedPaystackTransaction = {
  status: boolean;
  data?: {
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
    customer?: { email?: string };
    metadata?: { order_id?: string; order_reference?: string };
  };
};

export type PaymentVerificationRepository = {
  getPayment: (reference: string) => Promise<StoredPaymentAttempt | null>;
  getOrder: (id: string) => Promise<PaymentOrderDetails | null>;
  setPaymentStatus: (
    reference: string,
    status: "pending" | "failed" | "reconciliation_required",
  ) => Promise<void>;
  markVerifiedSuccess: (
    reference: string,
    amount: string | number,
    currency: string,
  ) => Promise<"success" | "duplicate_success">;
};

export type PaystackVerifier = (reference: string) => Promise<VerifiedPaystackTransaction>;

export type PaymentVerificationResult = {
  status: "success" | "duplicate_success" | "reconciliation_required" | "pending" | "failed";
  orderReference: string;
};

export async function verifyPaymentAttempt(
  referenceInput: unknown,
  repository: PaymentVerificationRepository,
  verifyWithPaystack: PaystackVerifier,
): Promise<PaymentVerificationResult> {
  const parsedReference = paymentReferenceSchema.safeParse(referenceInput);
  if (!parsedReference.success) throw new Error("The payment reference is invalid.");
  const reference = parsedReference.data;

  const payment = await repository.getPayment(reference);
  if (
    !payment ||
    payment.provider_reference !== reference ||
    (payment.currency !== "USD" && payment.currency !== "NGN")
  ) {
    throw new Error("The payment attempt could not be found.");
  }
  const order = await repository.getOrder(payment.order_id);
  if (!order || order.id !== payment.order_id) {
    throw new Error("The payment order could not be found.");
  }

  if (payment.status === "success") {
    return { status: "success", orderReference: order.reference };
  }
  if (payment.status === "duplicate_success") {
    return { status: "duplicate_success", orderReference: order.reference };
  }
  if (payment.status === "reconciliation_required") {
    return { status: "reconciliation_required", orderReference: order.reference };
  }

  let transaction: VerifiedPaystackTransaction;
  try {
    transaction = await verifyWithPaystack(reference);
  } catch {
    await repository.setPaymentStatus(reference, "pending");
    return { status: "pending", orderReference: order.reference };
  }

  const data = transaction.data;
  if (!transaction.status || !data || data.reference !== reference) {
    await repository.setPaymentStatus(reference, "pending");
    return { status: "pending", orderReference: order.reference };
  }

  if (data.status !== "success") {
    const status =
      data.status === "failed" || data.status === "abandoned" ? "failed" : "pending";
    await repository.setPaymentStatus(reference, status);
    return { status, orderReference: order.reference };
  }

  const expectedAmountMinor = usdPriceToCents(payment.amount);
  const customerMatches =
    data.customer?.email === undefined ||
    data.customer.email.toLowerCase() === order.customer_email.toLowerCase();
  const orderMetadataMatches =
    data.metadata?.order_id === undefined || data.metadata.order_id === order.id;
  const referenceMetadataMatches =
    data.metadata?.order_reference === undefined ||
    data.metadata.order_reference === order.reference;
  if (
    !Number.isSafeInteger(data.amount) ||
    BigInt(data.amount ?? -1) !== expectedAmountMinor ||
    data.currency !== payment.currency ||
    !customerMatches ||
    !orderMetadataMatches ||
    !referenceMetadataMatches
  ) {
    await repository.setPaymentStatus(reference, "reconciliation_required");
    return { status: "reconciliation_required", orderReference: order.reference };
  }

  const status = await repository.markVerifiedSuccess(
    reference,
    payment.amount,
    payment.currency,
  );
  return { status, orderReference: order.reference };
}
