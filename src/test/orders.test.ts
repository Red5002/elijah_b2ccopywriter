import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyOrderValues, orderSchemas } from "../lib/orders";
import { submitMockOrder } from "../lib/submitOrder";

describe("order schemas", () => {
  it("requires valid contact, product, audience, and audit concern details", () => {
    expect(
      orderSchemas["paid-audit"].safeParse({
        ...emptyOrderValues,
        name: "Elijah",
        email: "elijah@example.com",
        productName: "Example",
        productUrl: "https://example.com",
        targetAudience: "Small teams",
        biggestConcern: "Visitors do not understand the product",
      }).success,
    ).toBe(true);

    expect(
      orderSchemas["paid-audit"].safeParse({
        ...emptyOrderValues,
        email: "not-an-email",
        productUrl: "example.com",
      }).success,
    ).toBe(false);
  });

  it("requires the flow-specific details", () => {
    expect(
      orderSchemas["flow-fix"].safeParse({
        ...emptyOrderValues,
        name: "Elijah",
        email: "elijah@example.com",
        productName: "Example",
        productUrl: "https://example.com",
        targetAudience: "Small teams",
        flowType: "Onboarding",
        existingFlow: "https://example.com/signup",
        desiredOutcome: "More users complete setup",
      }).success,
    ).toBe(true);
  });

  it("requires activation copy and problem details but leaves the welcome email optional", () => {
    expect(
      orderSchemas["activation-rewrite"].safeParse({
        ...emptyOrderValues,
        name: "Elijah",
        email: "elijah@example.com",
        productName: "Example",
        productUrl: "https://example.com",
        targetAudience: "Small teams",
        activationGoal: "Reach first project created",
        landingCopy: "Build better workflows",
        biggestConcern: "Users stop after signup",
      }).success,
    ).toBe(true);
  });
});

describe("mock order submission", () => {
  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState({}, "", "/");
  });

  it("returns a test confirmation without contacting a backend", async () => {
    vi.useFakeTimers();
    const submission = submitMockOrder({ offer: "paid-audit", values: emptyOrderValues });
    await vi.advanceTimersByTimeAsync(700);
    await expect(submission).resolves.toMatchObject({
      confirmationId: expect.stringMatching(/^TEST-/),
    });
  });

  it("can simulate a failure in development for retry-state testing", async () => {
    window.history.replaceState({}, "", "/?mockOrderFailure=1");
    vi.useFakeTimers();
    const submission = submitMockOrder({ offer: "flow-fix", values: emptyOrderValues });
    const rejection = expect(submission).rejects.toThrow("simulated order could not be created");
    await vi.advanceTimersByTimeAsync(700);
    await rejection;
  });
});
