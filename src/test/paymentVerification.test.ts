import { describe, expect, it, vi } from "vitest";
import {
  verifyPaymentAttempt,
  type PaymentVerificationRepository,
  type StoredPaymentAttempt,
  type VerifiedPaystackTransaction,
} from "../lib/paymentVerification";

const payment: StoredPaymentAttempt = {
  id: "payment-1",
  order_id: "00000000-0000-4000-8000-000000000001",
  provider_reference: "pay_12345678-1234-4123-8123-123456789012",
  amount: "25.00",
  currency: "USD",
  status: "pending",
};

const order = {
  id: payment.order_id,
  reference: "ORD-123",
  customer_email: "ada@example.com",
};

function createRepository(): PaymentVerificationRepository {
  return {
    getPayment: vi.fn().mockResolvedValue(payment),
    getOrder: vi.fn().mockResolvedValue(order),
    setPaymentStatus: vi.fn().mockResolvedValue(undefined),
    markVerifiedSuccess: vi.fn().mockResolvedValue("success"),
  };
}

function transaction(overrides: Partial<NonNullable<VerifiedPaystackTransaction["data"]>> = {}) {
  return {
    status: true,
    data: {
      reference: payment.provider_reference,
      status: "success",
      amount: 2500,
      currency: "USD",
      customer: { email: order.customer_email },
      metadata: { order_id: order.id, order_reference: order.reference },
      ...overrides,
    },
  };
}

describe("Paystack payment verification", () => {
  it("marks only a matching successful payment and returns its order reference", async () => {
    const repository = createRepository();
    const verifyPaystack = vi.fn().mockResolvedValue(transaction());

    await expect(
      verifyPaymentAttempt(payment.provider_reference, repository, verifyPaystack),
    ).resolves.toEqual({ status: "success", orderReference: order.reference });
    expect(repository.markVerifiedSuccess).toHaveBeenCalledWith(
      payment.provider_reference,
      payment.amount,
      payment.currency,
    );
    expect(repository.setPaymentStatus).not.toHaveBeenCalled();
  });

  it.each([
    ["amount mismatch", { amount: 2499 }],
    ["currency mismatch", { currency: "NGN" }],
    ["customer mismatch", { customer: { email: "other@example.com" } }],
    ["order mismatch", { metadata: { order_id: "other-order" } }],
  ])("rejects a successful transaction with %s", async (_label, overrides) => {
    const repository = createRepository();
    const verifyPaystack = vi.fn().mockResolvedValue(transaction(overrides));

    await expect(
      verifyPaymentAttempt(payment.provider_reference, repository, verifyPaystack),
    ).resolves.toEqual({
      status: "reconciliation_required",
      orderReference: order.reference,
    });
    expect(repository.setPaymentStatus).toHaveBeenCalledWith(
      payment.provider_reference,
      "reconciliation_required",
    );
    expect(repository.markVerifiedSuccess).not.toHaveBeenCalled();
  });

  it("leaves pending and failed transactions unpaid", async () => {
    const repository = createRepository();
    const verifyPaystack = vi
      .fn()
      .mockResolvedValueOnce(transaction({ status: "pending" }))
      .mockResolvedValueOnce(transaction({ status: "abandoned" }));

    await expect(
      verifyPaymentAttempt(payment.provider_reference, repository, verifyPaystack),
    ).resolves.toMatchObject({ status: "pending" });
    await expect(
      verifyPaymentAttempt(payment.provider_reference, repository, verifyPaystack),
    ).resolves.toMatchObject({ status: "failed" });
    expect(repository.markVerifiedSuccess).not.toHaveBeenCalled();
  });

  it("is idempotent when the payment has already been verified", async () => {
    const repository = createRepository();
    vi.mocked(repository.getPayment).mockResolvedValueOnce({ ...payment, status: "success" });
    const verifyPaystack = vi.fn();

    await expect(
      verifyPaymentAttempt(payment.provider_reference, repository, verifyPaystack),
    ).resolves.toEqual({ status: "success", orderReference: order.reference });
    expect(verifyPaystack).not.toHaveBeenCalled();
    expect(repository.markVerifiedSuccess).not.toHaveBeenCalled();
  });

  it("reports an additional successful charge as recorded for reconciliation", async () => {
    const repository = createRepository();
    vi.mocked(repository.markVerifiedSuccess).mockResolvedValueOnce("duplicate_success");
    const verifyPaystack = vi.fn().mockResolvedValue(transaction());

    await expect(
      verifyPaymentAttempt(payment.provider_reference, repository, verifyPaystack),
    ).resolves.toEqual({
      status: "duplicate_success",
      orderReference: order.reference,
    });
  });

  it("preserves evidence of a successful charge with mismatched details for reconciliation", async () => {
    const repository = createRepository();
    const verifyPaystack = vi.fn().mockResolvedValue(transaction({ amount: 2499 }));

    await expect(
      verifyPaymentAttempt(payment.provider_reference, repository, verifyPaystack),
    ).resolves.toEqual({
      status: "reconciliation_required",
      orderReference: order.reference,
    });
    expect(repository.setPaymentStatus).toHaveBeenCalledWith(
      payment.provider_reference,
      "reconciliation_required",
    );
    expect(repository.markVerifiedSuccess).not.toHaveBeenCalled();
  });

  it("rejects invalid payment references before querying storage", async () => {
    const repository = createRepository();

    await expect(verifyPaymentAttempt("not-a-reference", repository, vi.fn())).rejects.toThrow(
      "payment reference is invalid",
    );
    expect(repository.getPayment).not.toHaveBeenCalled();
  });

  it("returns pending if Paystack verification is temporarily unavailable", async () => {
    const repository = createRepository();

    await expect(
      verifyPaymentAttempt(payment.provider_reference, repository, vi.fn().mockRejectedValue(new Error())),
    ).resolves.toEqual({ status: "pending", orderReference: order.reference });
    expect(repository.markVerifiedSuccess).not.toHaveBeenCalled();
  });
});
