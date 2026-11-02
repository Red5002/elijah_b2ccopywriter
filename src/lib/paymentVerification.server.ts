import "@tanstack/react-start/server-only";

import { createAdminSupabaseClient } from "./supabaseAdmin.server";
import {
  verifyPaymentAttempt,
  type PaystackVerifier,
  type PaymentVerificationRepository,
} from "./paymentVerification";

function createVerificationRepository(): PaymentVerificationRepository {
  const supabase = createAdminSupabaseClient();
  return {
    async getPayment(reference) {
      const { data, error } = await supabase
        .from("payments")
        .select("id, order_id, provider_reference, amount, currency, status")
        .eq("provider", "paystack")
        .eq("provider_reference", reference)
        .maybeSingle();
      if (error) throw new Error("Unable to load payment attempt.");
      return data;
    },
    async getOrder(id) {
      const { data, error } = await supabase
        .from("orders")
        .select("id, reference, customer_email")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error("Unable to load payment order.");
      return data;
    },
    async setPaymentStatus(reference, status) {
      const { error } = await supabase
        .from("payments")
        .update({ status })
        .eq("provider", "paystack")
        .eq("provider_reference", reference)
        .not("status", "in", "(success,duplicate_success,reconciliation_required)");
      if (error) throw new Error("Unable to update payment status.");
    },
    async markVerifiedSuccess(reference, amount, currency) {
      const { data, error } = await supabase.rpc("mark_payment_verified_success", {
        p_reference: reference,
        p_expected_amount: amount,
        p_expected_currency: currency,
      });
      if (error) throw new Error("Unable to record verified payment.");
      const result = (data as Array<{ payment_status?: string }> | null)?.[0]
        ?.payment_status;
      if (result !== "success" && result !== "duplicate_success") {
        throw new Error("Payment verification returned an unexpected status.");
      }
      return result;
    },
  };
}

const verifyPaystackHttp: PaystackVerifier = async (reference) => {
  const secretKey = process.env["PAYSTACK_SECRET_KEY"];
  if (!secretKey) throw new Error("Paystack is not configured.");

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secretKey}` },
    },
  );
  if (!response.ok) throw new Error("Paystack transaction verification failed.");
  return response.json() as Promise<Awaited<ReturnType<PaystackVerifier>>>;
};

export function verifyServerPayment(reference: string) {
  return verifyPaymentAttempt(reference, createVerificationRepository(), verifyPaystackHttp);
}

export async function handlePaystackWebhook(request: Request): Promise<Response> {
  const secretKey = process.env["PAYSTACK_SECRET_KEY"];
  if (!secretKey) return new Response("Webhook is not configured.", { status: 503 });

  const signature = request.headers.get("x-paystack-signature");
  if (!signature || !/^[a-f\d]{128}$/i.test(signature)) {
    return new Response("Invalid signature.", { status: 401 });
  }

  const rawBody = await request.text();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secretKey),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const expectedSignature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)),
  );
  const suppliedSignature = Uint8Array.from(
    signature.match(/.{2}/g)?.map((part) => Number.parseInt(part, 16)) ?? [],
  );
  let signatureDifference = expectedSignature.length ^ suppliedSignature.length;
  for (let index = 0; index < expectedSignature.length; index += 1) {
    signatureDifference |= (expectedSignature[index] ?? 0) ^ (suppliedSignature[index] ?? 0);
  }
  if (signatureDifference !== 0) {
    return new Response("Invalid signature.", { status: 401 });
  }

  let body: { event?: unknown; data?: { reference?: unknown } };
  try {
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    return new Response("Invalid payload.", { status: 400 });
  }

  if (body.event !== "charge.success") return new Response("Ignored.", { status: 200 });
  const reference = body.data?.reference;
  if (typeof reference !== "string") return new Response("Invalid payload.", { status: 400 });

  try {
    const result = await verifyServerPayment(reference);
    return new Response(
      result.status === "success"
        ? "Verified."
        : result.status === "duplicate_success"
          ? "Successful charge recorded for reconciliation."
          : result.status === "reconciliation_required"
            ? "Successful charge requires reconciliation."
            : result.status === "pending"
              ? "Verification pending."
              : "Payment was not verified.",
      { status: result.status === "pending" ? 503 : 200 },
    );
  } catch {
    return new Response("Unable to verify payment.", { status: 500 });
  }
}
