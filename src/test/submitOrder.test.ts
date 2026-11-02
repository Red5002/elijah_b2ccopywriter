import { describe, expect, it, vi } from "vitest";
import {
  createOrderInputSchema,
  createOrderRecord,
  type OrderRepository,
} from "../lib/orderSubmission";
import { emptyOrderValues, type OrderFormValues } from "../lib/orders";

const validValues: OrderFormValues = {
  ...emptyOrderValues,
  name: "Ada Example",
  email: "ada@example.com",
  productName: "Example product",
  websiteAvailability: "no-public-site",
  productDescription: "A tool for managing work",
  targetAudience: "Small teams",
  auditType: "Landing page",
  biggestConcern: "Visitors do not understand the product",
  auditImprove: "Clarify the value proposition",
  auditOutcome: "Know what to change",
};

describe("server order function input validation", () => {
  it("accepts a valid service ID and form payload", () => {
    expect(
      createOrderInputSchema.safeParse({
        serviceId: "paid-audit",
        submissionKey: "11111111-1111-4111-8111-111111111111",
        values: validValues,
      }).success,
    ).toBe(true);
  });

  it("rejects unknown services and untrusted order metadata", () => {
    expect(
      createOrderInputSchema.safeParse({
        serviceId: "unlisted-service",
        submissionKey: "11111111-1111-4111-8111-111111111111",
        values: validValues,
      }).success,
    ).toBe(false);

    expect(
      createOrderInputSchema.safeParse({
        serviceId: "paid-audit",
        submissionKey: "11111111-1111-4111-8111-111111111111",
        values: validValues,
        price: 0,
      }).success,
    ).toBe(false);
  });

  it("requires a cryptographically generated UUID v4 submission key", () => {
    expect(
      createOrderInputSchema.safeParse({
        serviceId: "paid-audit",
        submissionKey: "not-a-key",
        values: validValues,
      }).success,
    ).toBe(false);
    expect(
      createOrderInputSchema.safeParse({
        serviceId: "paid-audit",
        submissionKey: "11111111-1111-1111-8111-111111111111",
        values: validValues,
      }).success,
    ).toBe(false);
  });

  it("rejects invalid customer values during server-side validation before service lookup", async () => {
    const repository: OrderRepository = {
      getActiveService: vi.fn(),
      getOrderBySubmissionKey: vi.fn(),
      insertOrder: vi.fn(),
    };
    expect(
      createOrderInputSchema.safeParse({
        serviceId: "paid-audit",
        submissionKey: "11111111-1111-4111-8111-111111111111",
        values: { ...validValues, email: "not-an-email" },
      }).success,
    ).toBe(true);

    await expect(
      createOrderRecord(
        {
          serviceId: "paid-audit",
          submissionKey: "11111111-1111-4111-8111-111111111111",
          values: { ...validValues, email: "not-an-email" },
        },
        repository,
      ),
    ).rejects.toMatchObject({ code: "validation" });
    expect(repository.getActiveService).not.toHaveBeenCalled();
    expect(repository.insertOrder).not.toHaveBeenCalled();
  });
});
