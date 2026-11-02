import { z } from "zod";
import {
  paymentAmountFromPrice,
  paymentCurrencySchema,
  toSafeMinorUnitNumber,
  type PaymentCurrency,
} from "./paymentAmounts";
import {
  ExchangeRateUnavailableError,
  type ExchangeRateSnapshot,
} from "./exchangeRateTypes";
import type { OrderOfferId } from "./orders";

export const paymentQuoteInputSchema = z
  .object({ serviceId: z.enum(["paid-audit", "flow-fix", "activation-rewrite"]) })
  .strict();

const uuidV4Schema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
);

const paymentReferenceSchema = z.string().regex(
  /^pay_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
);

export const initializePaymentInputSchema = z
  .object({
    orderId: uuidV4Schema,
    submissionKey: uuidV4Schema,
    currency: paymentCurrencySchema,
  })
  .strict();

export const verifyPaymentInputSchema = z
  .object({ reference: paymentReferenceSchema })
  .strict();

export const retryPaymentInputSchema = verifyPaymentInputSchema;

export type PaymentService = {
  id: string;
  name: string;
  price: string | number;
  currency: string;
};

export type PaymentOrder = {
  id: string;
  reference: string;
  service_id: string;
  customer_email: string;
  submission_key: string;
  price: string | number;
  currency: string;
  payment_status: string;
};

export type NewPaymentAttempt = {
  order_id: string;
  provider: "paystack";
  provider_reference: string;
  amount: string;
  currency: PaymentCurrency;
  status: "pending";
  exchange_rate: string | null;
  exchange_rate_source: string | null;
  exchange_rate_date: string | null;
};

export type PaymentRepository = {
  getActiveService: (serviceId: OrderOfferId) => Promise<PaymentService | null>;
  getOrder: (orderId: string, submissionKey: string) => Promise<PaymentOrder | null>;
  getRetryPayment: (
    reference: string,
  ) => Promise<{ order_id: string; currency: string; status: string } | null>;
  getOrderById: (orderId: string) => Promise<PaymentOrder | null>;
  getLatestRate: () => Promise<ExchangeRateSnapshot>;
  insertPayment: (payment: NewPaymentAttempt) => Promise<void>;
  setPaymentStatus: (
    reference: string,
    status: "failed" | "pending" | "reconciliation_required",
  ) => Promise<void>;
};

export type PaystackTransaction = {
  status: boolean;
  message?: string;
  data?: {
    authorization_url?: string;
    reference?: string;
  };
};

export type PaymentInitializer = (input: {
  email: string;
  currency: PaymentCurrency;
  amount: number;
  reference: string;
  callbackUrl: string;
  orderId: string;
  orderReference: string;
}) => Promise<PaystackTransaction>;

const serviceIdSchema = z.enum(["paid-audit", "flow-fix", "activation-rewrite"]);

export type PaymentQuote = {
  serviceId: OrderOfferId;
  serviceName: string;
  usdAmount: string;
  ngn: {
    available: true;
    amount: string;
    rate: string;
    source: string;
    effectiveDate: string;
  } | {
    available: false;
    reason: string;
  };
};

export async function getPaymentQuote(
  input: unknown,
  repository: Pick<PaymentRepository, "getActiveService" | "getLatestRate">,
): Promise<PaymentQuote> {
  const parsed = paymentQuoteInputSchema.safeParse(input);
  if (!parsed.success) throw new Error("Please choose a valid service.");

  const service = await repository.getActiveService(parsed.data.serviceId);
  if (!service || service.id !== parsed.data.serviceId || service.currency !== "USD") {
    throw new Error("This service is currently unavailable. Please refresh and try again.");
  }

  const usd = paymentAmountFromPrice(service.price, "USD");
  let ngn: PaymentQuote["ngn"];
  try {
    const rate = await repository.getLatestRate();
    const converted = paymentAmountFromPrice(service.price, "NGN", rate.rate);
    ngn = {
      available: true,
      amount: converted.amount,
      rate: rate.rate,
      source: rate.source,
      effectiveDate: rate.effectiveDate,
    };
  } catch (error) {
    if (!(error instanceof ExchangeRateUnavailableError)) throw error;
    ngn = { available: false, reason: error.message };
  }

  return {
    serviceId: parsed.data.serviceId,
    serviceName: service.name,
    usdAmount: usd.amount,
    ngn,
  };
}

export async function initializePayment(
  input: unknown,
  repository: PaymentRepository,
  initializePaystack: PaymentInitializer,
  options: {
    reference: string;
    callbackUrl: string;
  },
) {
  const parsed = initializePaymentInputSchema.safeParse(input);
  if (!parsed.success) throw new Error("The payment request is invalid. Please try again.");

  const order = await repository.getOrder(parsed.data.orderId, parsed.data.submissionKey);
  if (!order) throw new Error("The order could not be found. Please review and submit it again.");
  if (order.payment_status === "paid") {
    throw new Error("This order is already paid and cannot start another checkout.");
  }

  return initializePaymentForOrder(order, parsed.data.currency, repository, initializePaystack, options);
}

export async function retryPayment(
  input: unknown,
  repository: PaymentRepository,
  initializePaystack: PaymentInitializer,
  options: { reference: string; callbackUrl: string },
) {
  const parsed = retryPaymentInputSchema.safeParse(input);
  if (!parsed.success) throw new Error("The payment reference is invalid.");

  const failedPayment = await repository.getRetryPayment(parsed.data.reference);
  if (
    !failedPayment ||
    failedPayment.status !== "failed" ||
    (failedPayment.currency !== "USD" && failedPayment.currency !== "NGN")
  ) {
    throw new Error("This payment cannot be retried. Please contact support if you need help.");
  }
  const order = await repository.getOrderById(failedPayment.order_id);
  if (!order || !order.submission_key) {
    throw new Error("The original order could not be found for payment retry.");
  }
  if (order.payment_status === "paid") {
    throw new Error("This order is already paid and cannot start another checkout.");
  }

  return initializePaymentForOrder(
    order,
    failedPayment.currency,
    repository,
    initializePaystack,
    options,
  );
}

async function initializePaymentForOrder(
  order: PaymentOrder,
  currency: PaymentCurrency,
  repository: PaymentRepository,
  initializePaystack: PaymentInitializer,
  options: { reference: string; callbackUrl: string },
) {
  const serviceId = serviceIdSchema.parse(order.service_id);
  if (
    order.currency !== "USD" ||
    !order.customer_email ||
    !order.submission_key ||
    !Number.isFinite(Number(order.price)) ||
    Number(order.price) <= 0
  ) {
    throw new Error("This service is currently unavailable. Please refresh and try again.");
  }

  let rate: ExchangeRateSnapshot | null = null;
  if (currency === "NGN") {
    rate = await repository.getLatestRate();
  }

  const { amount, minorUnits } = paymentAmountFromPrice(
    order.price,
    currency,
    rate?.rate,
  );
  const amountMinorUnits = toSafeMinorUnitNumber(minorUnits);
  const payment: NewPaymentAttempt = {
    order_id: order.id,
    provider: "paystack",
    provider_reference: options.reference,
    amount,
    currency,
    status: "pending",
    exchange_rate: rate?.rate ?? null,
    exchange_rate_source: rate?.source ?? null,
    exchange_rate_date: rate?.effectiveDate ?? null,
  };

  await repository.insertPayment(payment);
  let response: PaystackTransaction;
  try {
    response = await initializePaystack({
      email: order.customer_email,
      currency,
      amount: amountMinorUnits,
      reference: options.reference,
      callbackUrl: options.callbackUrl,
      orderId: order.id,
      orderReference: order.reference,
    });
  } catch {
    await repository.setPaymentStatus(options.reference, "failed");
    throw new Error("Paystack checkout could not be started. You can safely retry payment.");
  }

  const authorizationUrl = response.data?.authorization_url;
  if (
    !response.status ||
    response.data?.reference !== options.reference ||
    !authorizationUrl ||
    !isPaystackCheckoutUrl(authorizationUrl)
  ) {
    await repository.setPaymentStatus(options.reference, "failed");
    throw new Error("Paystack checkout could not be started. You can safely retry payment.");
  }

  return {
    authorizationUrl,
    reference: options.reference,
    orderReference: order.reference,
    amount,
    currency,
    exchangeRate: rate,
  };
}

export function isPaystackCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "checkout.paystack.com";
  } catch {
    return false;
  }
}

export function paymentCurrency(value: unknown): PaymentCurrency {
  return paymentCurrencySchema.parse(value);
}
