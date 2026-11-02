import "@tanstack/react-start/server-only";

import { createAdminSupabaseClient } from "./supabaseAdmin.server";
import { getLatestValidExchangeRate } from "./exchangeRates.server";
import {
  getPaymentQuote,
  initializePayment,
  retryPayment,
  type PaymentInitializer,
  type PaymentOrder,
  type PaymentRepository,
  type PaymentService,
} from "./paymentFlow";
import type { OrderOfferId } from "./orders";

function createPaymentRepository(): PaymentRepository {
  const supabase = createAdminSupabaseClient();

  return {
    async getActiveService(serviceId: OrderOfferId): Promise<PaymentService | null> {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, price, currency")
        .eq("id", serviceId)
        .eq("active", true)
        .maybeSingle();
      if (error) throw new Error("Unable to load current service pricing.");
      return data;
    },
    async getOrder(orderId, submissionKey): Promise<PaymentOrder | null> {
      const { data, error } = await supabase
        .from("orders")
        .select("id, reference, service_id, customer_email, submission_key, price, currency, payment_status")
        .eq("id", orderId)
        .eq("submission_key", submissionKey)
        .maybeSingle();
      if (error) throw new Error("Unable to load the order.");
      return data;
    },
    async getOrderById(orderId): Promise<PaymentOrder | null> {
      const { data, error } = await supabase
        .from("orders")
        .select("id, reference, service_id, customer_email, submission_key, price, currency, payment_status")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw new Error("Unable to load the order.");
      return data;
    },
    async getRetryPayment(reference) {
      const { data, error } = await supabase
        .from("payments")
        .select("order_id, currency, status")
        .eq("provider", "paystack")
        .eq("provider_reference", reference)
        .maybeSingle();
      if (error) throw new Error("Unable to load the payment attempt.");
      return data;
    },
    getLatestRate: () => getLatestValidExchangeRate(supabase),
    async insertPayment(payment) {
      const { error } = await supabase.from("payments").insert(payment);
      if (error) throw new Error("Unable to create the payment attempt.");
    },
    async setPaymentStatus(reference, status) {
      const { error } = await supabase
        .from("payments")
        .update({ status })
        .eq("provider", "paystack")
        .eq("provider_reference", reference)
        .not("status", "in", "(success,duplicate_success,reconciliation_required)");
      if (error) throw new Error("Unable to update the payment attempt.");
    },
  };
}

export async function getServerPaymentQuote(serviceId: unknown) {
  const repository = createPaymentRepository();
  return getPaymentQuote({ serviceId }, repository);
}

function getCallbackUrl(): string {
  const value = process.env["PAYSTACK_CALLBACK_URL"];
  if (!value) throw new Error("Paystack callback URL is not configured.");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Paystack callback URL is invalid.");
  }
  if (
    url.pathname !== "/payment-return" ||
    (url.protocol !== "https:" &&
      !(import.meta.env.DEV && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))
  ) {
    throw new Error("Paystack callback URL must be a trusted /payment-return URL.");
  }
  return url.toString();
}

const initializePaystackHttp: PaymentInitializer = async (input) => {
  const secretKey = process.env["PAYSTACK_SECRET_KEY"];
  if (!secretKey) throw new Error("Paystack is not configured.");

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      currency: input.currency,
      amount: input.amount,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: {
        order_id: input.orderId,
        order_reference: input.orderReference,
      },
    }),
  });
  if (!response.ok) throw new Error("Paystack initialization failed.");
  return (await response.json()) as Awaited<ReturnType<PaymentInitializer>>;
};

export async function initializeServerPayment(input: unknown) {
  const repository = createPaymentRepository();
  const reference = `pay_${crypto.randomUUID()}`;
  return initializePayment(input, repository, initializePaystackHttp, {
    reference,
    callbackUrl: getCallbackUrl(),
  });
}

export async function retryServerPayment(input: unknown) {
  const repository = createPaymentRepository();
  const reference = `pay_${crypto.randomUUID()}`;
  return retryPayment(input, repository, initializePaystackHttp, {
    reference,
    callbackUrl: getCallbackUrl(),
  });
}
