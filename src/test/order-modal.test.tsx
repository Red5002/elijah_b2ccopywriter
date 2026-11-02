import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRef, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { orderOffers } from "../lib/orders";
import { getCheckoutQuote, initializeCheckout, redirectToPaystack } from "../lib/payments";
import { submitOrder } from "../lib/submitOrder";
import { OrderModal } from "../portfolio/components/order-modal/OrderModal";

vi.mock("../lib/submitOrder", () => ({ submitOrder: vi.fn() }));
vi.mock("../lib/payments", () => ({
  getCheckoutQuote: vi.fn(),
  initializeCheckout: vi.fn(),
  redirectToPaystack: vi.fn(),
}));

type TestOfferId = "paid-audit" | "flow-fix" | "activation-rewrite";

function renderOffer(offerId: TestOfferId, onClose = vi.fn()) {
  return {
    onClose,
    ...render(<OrderModal offerId={offerId} onClose={onClose} triggerRef={{ current: null }} />),
  };
}

function fillRequiredFields(offerId: TestOfferId) {
  for (const field of orderOffers[offerId].fields) {
    if (!field.required) continue;

    const input = document.getElementById(`order-${field.name}`);
    if (!input) throw new Error(`Missing form field: ${field.name}`);

    const value =
      field.name === "email"
        ? "ada@example.com"
        : field.name === "websiteAvailability"
          ? "no-public-site"
          : field.type === "select"
            ? (field.options[0]?.value ?? "")
            : field.type === "url"
              ? "https://example.com"
              : `Test ${field.label}`;
    fireEvent.change(input, { target: { value } });
  }
}

async function continueToReview(offerId: TestOfferId) {
  fillRequiredFields(offerId);
  fireEvent.click(screen.getByRole("button", { name: "Review order" }));
  await screen.findByRole("heading", { name: "Review your order" });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Continue to payment" })).toBeEnabled(),
  );
}

function OrderModalHarness() {
  const [offerId, setOfferId] = useState<TestOfferId | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={triggerRef} onClick={() => setOfferId("paid-audit")}>
        {"Open Paid Audit order"}
      </button>
      <OrderModal offerId={offerId} onClose={() => setOfferId(null)} triggerRef={triggerRef} />
    </>
  );
}

describe("service order forms", () => {
  beforeEach(() => {
    vi.mocked(submitOrder).mockReset();
    vi.mocked(submitOrder).mockResolvedValue({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "ORD-TEST",
    });
    vi.mocked(getCheckoutQuote).mockReset();
    vi.mocked(getCheckoutQuote).mockResolvedValue({
      serviceId: "paid-audit",
      serviceName: "Paid Audit",
      usdAmount: "25.00",
      ngn: { available: false, reason: "No current CBN NFEM rate." },
    });
    vi.mocked(initializeCheckout).mockReset();
    vi.mocked(initializeCheckout).mockResolvedValue({
      authorizationUrl: "https://checkout.paystack.com/example",
      reference: "pay_12345678-1234-4123-8123-123456789012",
      orderReference: "ORD-TEST",
      amount: "25.00",
      currency: "USD",
      exchangeRate: null,
    });
    vi.mocked(redirectToPaystack).mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    window.history.replaceState({}, "", "/");
  });

  it("renders the paid audit questions and makes the product URL conditional", () => {
    renderOffer("paid-audit");

    expect(screen.getByLabelText(/Full name/)).toBeRequired();
    expect(screen.getByLabelText(/Email address/)).toBeRequired();
    expect(screen.getByLabelText(/Company or product name/)).toBeRequired();
    expect(screen.getByLabelText(/Briefly describe your product/)).toBeRequired();
    expect(screen.getByLabelText(/Who is your target audience/)).toBeRequired();
    expect(screen.getByLabelText(/What would you like me to audit/)).toBeRequired();
    expect(screen.getByRole("option", { name: "Cancellation flow" })).toBeInTheDocument();
    expect(screen.getByLabelText(/What problem are you noticing/)).toBeRequired();
    expect(screen.getByLabelText(/What would you like to improve/)).toBeRequired();
    expect(screen.getByLabelText(/What outcome would make this audit valuable/)).toBeRequired();
    expect(screen.getByLabelText(/Additional context or reference links/)).not.toBeRequired();

    const websiteChoice = screen.getByLabelText(/Is a public product website available/);
    const productUrl = screen.getByLabelText(/Product website or relevant URL/);
    expect(productUrl).not.toBeRequired();
    fireEvent.change(websiteChoice, { target: { value: "public" } });
    expect(productUrl).toBeRequired();
  });

  it("renders the focused flow-fix questions and leaves existing copy optional", () => {
    renderOffer("flow-fix");

    expect(screen.getByLabelText(/Which flow needs fixing/)).toBeRequired();
    expect(screen.getByRole("option", { name: "Empty state" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Where does this experience appear/)).toBeRequired();
    expect(screen.getByLabelText(/What does the current copy say/)).not.toBeRequired();
    expect(screen.getByLabelText(/What should users understand or do/)).toBeRequired();
    expect(screen.getByLabelText(/What isn't working with the current experience/)).toBeRequired();
    expect(screen.getByLabelText(/Preferred brand voice or tone/)).not.toBeRequired();
    expect(screen.getByLabelText(/Reference links or additional context/)).not.toBeRequired();
  });

  it("renders activation questions and leaves all existing copy optional", () => {
    renderOffer("activation-rewrite");

    expect(screen.getByLabelText(/What primary problem does your product solve/)).toBeRequired();
    expect(screen.getByLabelText(/first meaningful action/)).toBeRequired();
    expect(screen.getByLabelText(/What should users understand before/)).toBeRequired();
    expect(
      screen.getByLabelText(/What difficulties do users currently encounter/),
    ).not.toBeRequired();
    expect(screen.getByLabelText(/What outcome would make this project successful/)).toBeRequired();
    expect(screen.getByLabelText(/Current hero headline and supporting copy/)).not.toBeRequired();
    expect(screen.getByLabelText(/Current empty-state copy/)).not.toBeRequired();
    expect(screen.getByLabelText(/Current welcome email/)).not.toBeRequired();
    expect(screen.getByLabelText(/Words, claims, or messaging to avoid/)).not.toBeRequired();
    expect(screen.getByLabelText(/Reference links or additional context/)).not.toBeRequired();
  });

  it.each([
    ["paid-audit", "Paid Audit", 25],
    ["flow-fix", "Flow Fix", 75],
    ["activation-rewrite", "Activation Rewrite", 195],
  ] as const)("checks out a %s request accurately", async (offerId, name, price) => {
    vi.mocked(getCheckoutQuote).mockResolvedValue({
      serviceId: offerId,
      serviceName: name,
      usdAmount: `${price}.00`,
      ngn: { available: false, reason: "No current CBN NFEM rate." },
    });
    vi.mocked(initializeCheckout).mockResolvedValue({
      authorizationUrl: "https://checkout.paystack.com/example",
      reference: "pay_12345678-1234-4123-8123-123456789012",
      orderReference: "ORD-TEST",
      amount: `${price}.00`,
      currency: "USD",
      exchangeRate: null,
    });
    renderOffer(offerId);

    expect(screen.getByRole("heading", { name: `${name} · $${price}` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Review order" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await continueToReview(offerId);
    expect(screen.getByRole("heading", { name: "Review your order" })).toBeInTheDocument();
    expect(screen.getByText(name)).toBeInTheDocument();
    expect(screen.getByText(`$${price}.00`)).toBeInTheDocument();
    expect(screen.getByText("Test Company or product name")).toBeInTheDocument();

    expect(await screen.findByText("Payment is processed securely by Paystack after you continue to checkout.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    await waitFor(() => expect(redirectToPaystack).toHaveBeenCalledWith(
      "https://checkout.paystack.com/example",
    ));
    expect(submitOrder).toHaveBeenCalledTimes(1);
    expect(submitOrder).toHaveBeenCalledWith({
      data: {
        serviceId: offerId,
        submissionKey: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
        values: expect.objectContaining({ email: "ada@example.com" }),
      },
    });
    expect(initializeCheckout).toHaveBeenCalledWith({
      data: {
        orderId: "00000000-0000-4000-8000-000000000001",
        submissionKey: expect.any(String),
        currency: "USD",
      },
    });
  });

  it("shows initialization errors and retries payment against the existing order", async () => {
    vi.mocked(initializeCheckout)
      .mockRejectedValueOnce(new Error("Paystack checkout could not be started."))
      .mockResolvedValueOnce({
        authorizationUrl: "https://checkout.paystack.com/retry",
        reference: "pay_12345678-1234-4123-8123-123456789012",
        orderReference: "ORD-TEST",
        amount: "25.00",
        currency: "USD",
        exchangeRate: null,
      });
    renderOffer("paid-audit");
    await continueToReview("paid-audit");

    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Paystack checkout could not be started.");
    expect(screen.getByText(/Order reference: ORD-TEST/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry payment" }));

    await waitFor(() => expect(redirectToPaystack).toHaveBeenCalledWith(
      "https://checkout.paystack.com/retry",
    ));
    expect(submitOrder).toHaveBeenCalledTimes(1);
    expect(initializeCheckout).toHaveBeenCalledTimes(2);
    expect(initializeCheckout.mock.calls[0]?.[0].data.orderId).toBe(
      initializeCheckout.mock.calls[1]?.[0].data.orderId,
    );
  });

  it("requires confirmation when the server's NGN retry quote has changed", async () => {
    vi.mocked(getCheckoutQuote).mockResolvedValue({
      serviceId: "paid-audit",
      serviceName: "Paid Audit",
      usdAmount: "25.00",
      ngn: {
        available: true,
        amount: "37500.00",
        rate: "1500.000000",
        source: "CBN NFEM",
        effectiveDate: "2026-11-01",
      },
    });
    vi.mocked(initializeCheckout).mockResolvedValue({
      authorizationUrl: "https://checkout.paystack.com/updated-rate",
      reference: "pay_12345678-1234-4123-8123-123456789012",
      orderReference: "ORD-TEST",
      amount: "40000.00",
      currency: "NGN",
      exchangeRate: {
        rate: "1600.000000",
        source: "CBN NFEM",
        effectiveDate: "2026-11-02",
      },
    });
    renderOffer("paid-audit");
    await continueToReview("paid-audit");
    fireEvent.change(screen.getByLabelText("Payment currency"), { target: { value: "NGN" } });

    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    expect(await screen.findByText(/rate changed since you reviewed the quote/i)).toBeInTheDocument();
    expect(screen.getByText("₦40000.00")).toBeInTheDocument();
    expect(redirectToPaystack).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Confirm amount and continue" }));
    expect(redirectToPaystack).toHaveBeenCalledWith(
      "https://checkout.paystack.com/updated-rate",
    );
  });

  it("prevents duplicate order creation while submission is pending", async () => {
    let finishSubmission:
      | ((result: { id: string; reference: string }) => void)
      | undefined;
    vi.mocked(submitOrder).mockReturnValue(
      new Promise((resolve) => {
        finishSubmission = resolve;
      }),
    );
    renderOffer("flow-fix");
    await continueToReview("flow-fix");

    const submitButton = screen.getByRole("button", { name: "Continue to payment" });
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    expect(submitOrder).toHaveBeenCalledTimes(1);

    finishSubmission?.({
      id: "00000000-0000-4000-8000-000000000001",
      reference: "ORD-FLOW-FIX-123",
    });
    await waitFor(() => expect(redirectToPaystack).toHaveBeenCalledTimes(1));
    expect(submitOrder).toHaveBeenCalledTimes(1);
  });

  it("limits the requested mock failure to development without calling the server", async () => {
    window.history.replaceState({}, "", "/?mockOrderFailure=1");
    vi.stubEnv("DEV", true);
    renderOffer("paid-audit");
    await continueToReview("paid-audit");

    fireEvent.click(screen.getByRole("button", { name: "Continue to payment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No order was created");
    expect(submitOrder).not.toHaveBeenCalled();

    vi.stubEnv("DEV", false);
    fireEvent.click(screen.getByRole("button", { name: "Retry checkout" }));
    await waitFor(() => expect(redirectToPaystack).toHaveBeenCalledTimes(1));
    expect(submitOrder).toHaveBeenCalledTimes(1);
  });

  it("asks before discarding unsaved details and restores trigger focus after Escape", async () => {
    const confirmDiscard = vi.fn().mockReturnValue(false);
    vi.stubGlobal("confirm", confirmDiscard);
    render(<OrderModalHarness />);

    const trigger = screen.getByRole("button", { name: "Open Paid Audit order" });
    fireEvent.click(trigger);
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "Ada" } });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    expect(confirmDiscard).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    confirmDiscard.mockReturnValue(true);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("clears entered values and applies the new offer's fields when switching offers", async () => {
    const onClose = vi.fn();
    const triggerRef = createRef<HTMLElement>();
    const { rerender } = render(
      <OrderModal offerId="paid-audit" onClose={onClose} triggerRef={triggerRef} />,
    );
    fireEvent.change(screen.getByLabelText(/Full name/), { target: { value: "Ada" } });

    rerender(<OrderModal offerId="flow-fix" onClose={onClose} triggerRef={triggerRef} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Full name/)).toHaveValue("");
      expect(screen.getByLabelText(/Which flow needs fixing/)).toBeInTheDocument();
      expect(screen.queryByLabelText(/What would you like me to audit/)).not.toBeInTheDocument();
    });
  });
});
