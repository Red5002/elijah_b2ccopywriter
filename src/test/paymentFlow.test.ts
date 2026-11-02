import { describe, expect, it, vi } from "vitest";
import {
  exchangeRateToMicros,
  paymentAmountFromPrice,
  toSafeMinorUnitNumber,
  usdCentsToNgnKobo,
  usdPriceToCents,
} from "../lib/paymentAmounts";
import {
  getPaymentQuote,
  initializePayment,
  retryPayment,
  type PaymentInitializer,
  type PaymentRepository,
} from "../lib/paymentFlow";
import { ExchangeRateUnavailableError } from "../lib/exchangeRateTypes";

const order = {
  id: "00000000-0000-4000-8000-000000000001",
  reference: "ORD-100",
  service_id: "paid-audit",
  customer_email: "ada@example.com",
  submission_key: "11111111-1111-4111-8111-111111111111",
  price: "25.00",
  currency: "USD",
  payment_status: "unpaid",
};

function createRepository(): PaymentRepository {
  return {
    getActiveService: vi.fn().mockResolvedValue({
      id: "paid-audit",
      name: "Paid Audit",
      price: "25.00",
      currency: "USD",
    }),
    getOrder: vi.fn().mockResolvedValue(order),
    getRetryPayment: vi.fn().mockResolvedValue({
      order_id: order.id,
      currency: "USD",
      status: "failed",
    }),
    getOrderById: vi.fn().mockResolvedValue(order),
    getLatestRate: vi.fn().mockResolvedValue({
      rate: "1500.123456",
      source: "CBN NFEM",
      effectiveDate: "2026-11-02",
    }),
    insertPayment: vi.fn().mockResolvedValue(undefined),
    setPaymentStatus: vi.fn().mockResolvedValue(undefined),
  };
}

const paystackSuccess: PaymentInitializer = ({ reference }) =>
  Promise.resolve({
    status: true,
    data: {
      reference,
      authorization_url: "https://checkout.paystack.com/session",
    },
  });

describe("payment amount calculation", () => {
  it("calculates USD cents exactly", () => {
    expect(usdPriceToCents("25.00")).toBe(2500n);
    expect(paymentAmountFromPrice("75.00", "USD")).toEqual({
      minorUnits: 7500n,
      amount: "75.00",
    });
  });

  it("converts USD to NGN kobo and rounds to two decimal places", () => {
    const rate = exchangeRateToMicros("1500.123456");
    const kobo = usdCentsToNgnKobo(2500n, rate);
    expect(kobo).toBe(3_750_309n);
    expect(paymentAmountFromPrice("25.00", "NGN", "1500.123456")).toEqual({
      minorUnits: 3_750_309n,
      amount: "37503.09",
    });
    expect(toSafeMinorUnitNumber(kobo)).toBe(3_750_309);
  });
});

describe("payment quotes and initialization", () => {
  it("returns USD pricing even when no CBN exchange rate is available", async () => {
    const repository = createRepository();
    vi.mocked(repository.getLatestRate).mockRejectedValueOnce(new ExchangeRateUnavailableError());

    await expect(getPaymentQuote({ serviceId: "paid-audit" }, repository)).resolves.toMatchObject({
      usdAmount: "25.00",
      ngn: { available: false },
    });
  });

  it("initializes USD checkout without requesting an exchange rate", async () => {
    const repository = createRepository();
    vi.mocked(repository.getLatestRate).mockRejectedValue(
      new ExchangeRateUnavailableError(),
    );
    const initializePaystack = vi.fn().mockImplementation(paystackSuccess);

    const result = await initializePayment(
      { orderId: order.id, submissionKey: order.submission_key, currency: "USD" },
      repository,
      initializePaystack,
      { reference: "pay_12345678-1234-4123-8123-123456789012", callbackUrl: "https://site.test/payment-return" },
    );

    expect(initializePaystack).toHaveBeenCalledWith(
      expect.objectContaining({ email: order.customer_email, amount: 2500, currency: "USD" }),
    );
    expect(repository.getLatestRate).not.toHaveBeenCalled();
    expect(repository.insertPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: order.id,
        amount: "25.00",
        currency: "USD",
        exchange_rate: null,
        exchange_rate_source: null,
        exchange_rate_date: null,
      }),
    );
    expect(result.authorizationUrl).toBe("https://checkout.paystack.com/session");
  });

  it("stores the exact NGN rate snapshot used for checkout", async () => {
    const repository = createRepository();
    const initializePaystack = vi.fn().mockImplementation(paystackSuccess);

    await initializePayment(
      { orderId: order.id, submissionKey: order.submission_key, currency: "NGN" },
      repository,
      initializePaystack,
      { reference: "pay_12345678-1234-4123-8123-123456789012", callbackUrl: "https://site.test/payment-return" },
    );

    expect(initializePaystack).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 3_750_309, currency: "NGN" }),
    );
    expect(repository.insertPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: "37503.09",
        currency: "NGN",
        exchange_rate: "1500.123456",
        exchange_rate_source: "CBN NFEM",
        exchange_rate_date: "2026-11-02",
      }),
    );
  });

  it("blocks NGN checkout when a valid rate is unavailable", async () => {
    const repository = createRepository();
    vi.mocked(repository.getLatestRate).mockRejectedValueOnce(new ExchangeRateUnavailableError());
    const initializePaystack = vi.fn();

    await expect(
      initializePayment(
        { orderId: order.id, submissionKey: order.submission_key, currency: "NGN" },
        repository,
        initializePaystack,
        { reference: "pay_12345678-1234-4123-8123-123456789012", callbackUrl: "https://site.test/payment-return" },
      ),
    ).rejects.toThrow("NGN checkout is unavailable");
    expect(repository.insertPayment).not.toHaveBeenCalled();
    expect(initializePaystack).not.toHaveBeenCalled();
  });

  it("marks a failed initialization and retries against the existing order", async () => {
    const repository = createRepository();
    const initializePaystack = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockImplementationOnce(paystackSuccess);
    const options = {
      reference: "pay_12345678-1234-4123-8123-123456789012",
      callbackUrl: "https://site.test/payment-return",
    };

    await expect(
      initializePayment(
        { orderId: order.id, submissionKey: order.submission_key, currency: "USD" },
        repository,
        initializePaystack,
        options,
      ),
    ).rejects.toThrow("You can safely retry payment");
    expect(repository.setPaymentStatus).toHaveBeenCalledWith(options.reference, "failed");

    await retryPayment({ reference: options.reference }, repository, initializePaystack, {
      ...options,
      reference: "pay_22345678-1234-4123-8123-123456789012",
    });
    expect(repository.getOrderById).toHaveBeenCalledWith(order.id);
    expect(repository.insertPayment).toHaveBeenCalledTimes(2);
    expect(initializePaystack).toHaveBeenCalledTimes(2);
  });

  it("uses the current CBN NFEM rate for NGN retries and records the same snapshot", async () => {
    const repository = createRepository();
    vi.mocked(repository.getRetryPayment).mockResolvedValueOnce({
      order_id: order.id,
      currency: "NGN",
      status: "failed",
    });
    vi.mocked(repository.getLatestRate).mockResolvedValueOnce({
      rate: "1600.000000",
      source: "CBN NFEM",
      effectiveDate: "2026-11-02",
    });
    const initializePaystack = vi.fn().mockImplementation(paystackSuccess);

    await retryPayment(
      { reference: "pay_12345678-1234-4123-8123-123456789012" },
      repository,
      initializePaystack,
      {
        reference: "pay_22345678-1234-4123-8123-123456789012",
        callbackUrl: "https://site.test/payment-return",
      },
    );

    expect(initializePaystack).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 4_000_000, currency: "NGN" }),
    );
    expect(repository.insertPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        order_id: order.id,
        provider_reference: "pay_22345678-1234-4123-8123-123456789012",
        amount: "40000.00",
        currency: "NGN",
        exchange_rate: "1600.000000",
        exchange_rate_source: "CBN NFEM",
        exchange_rate_date: "2026-11-02",
      }),
    );
  });

  it("retries USD at the original order price without looking up an exchange rate", async () => {
    const repository = createRepository();
    vi.mocked(repository.getRetryPayment).mockResolvedValueOnce({
      order_id: order.id,
      currency: "USD",
      status: "failed",
    });
    vi.mocked(repository.getActiveService).mockResolvedValueOnce({
      id: "paid-audit",
      name: "Paid Audit",
      price: "999.00",
      currency: "USD",
    });
    const initializePaystack = vi.fn().mockImplementation(paystackSuccess);

    await retryPayment(
      { reference: "pay_12345678-1234-4123-8123-123456789012" },
      repository,
      initializePaystack,
      {
        reference: "pay_32345678-1234-4123-8123-123456789012",
        callbackUrl: "https://site.test/payment-return",
      },
    );

    expect(initializePaystack).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 2500, currency: "USD" }),
    );
    expect(repository.getLatestRate).not.toHaveBeenCalled();
    expect(repository.insertPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "25.00", currency: "USD" }),
    );
  });

  it("rejects mismatched order keys and does not create a payment", async () => {
    const repository = createRepository();
    vi.mocked(repository.getOrder).mockResolvedValueOnce(null);
    const initializePaystack = vi.fn();

    await expect(
      initializePayment(
        {
          orderId: order.id,
          submissionKey: "21111111-1111-4111-8111-111111111111",
          currency: "USD",
        },
        repository,
        initializePaystack,
        {
          reference: "pay_12345678-1234-4123-8123-123456789012",
          callbackUrl: "https://site.test/payment-return",
        },
      ),
    ).rejects.toThrow("order could not be found");
    expect(repository.getOrder).toHaveBeenCalledWith(
      order.id,
      "21111111-1111-4111-8111-111111111111",
    );
    expect(repository.insertPayment).not.toHaveBeenCalled();
    expect(initializePaystack).not.toHaveBeenCalled();
  });

  it("does not retry a reference that is not a recorded failed payment", async () => {
    const repository = createRepository();
    vi.mocked(repository.getRetryPayment).mockResolvedValueOnce(null);

    await expect(
      retryPayment(
        { reference: "pay_12345678-1234-4123-8123-123456789012" },
        repository,
        vi.fn(),
        {
          reference: "pay_22345678-1234-4123-8123-123456789012",
          callbackUrl: "https://site.test/payment-return",
        },
      ),
    ).rejects.toThrow("payment cannot be retried");
    expect(repository.getOrderById).not.toHaveBeenCalled();
  });

  it("prevents a paid order from starting a new checkout or retry", async () => {
    const repository = createRepository();
    vi.mocked(repository.getOrder).mockResolvedValueOnce({
      ...order,
      payment_status: "paid",
    });

    await expect(
      initializePayment(
        { orderId: order.id, submissionKey: order.submission_key, currency: "USD" },
        repository,
        vi.fn(),
        {
          reference: "pay_12345678-1234-4123-8123-123456789012",
          callbackUrl: "https://site.test/payment-return",
        },
      ),
    ).rejects.toThrow("already paid");
    expect(repository.insertPayment).not.toHaveBeenCalled();
  });
});
