import { describe, expect, it, vi } from "vitest";
import { emptyOrderValues, orderSchemas } from "../lib/orders";
import {
  createOrderRecord,
  OrderCreationError,
  type OrderRepository,
} from "../lib/orderSubmission";

describe("order schemas", () => {
  it("requires valid contact, product, audience, and audit concern details", () => {
    expect(
      orderSchemas["paid-audit"].safeParse({
        ...emptyOrderValues,
        name: "Elijah",
        email: "elijah@example.com",
        productName: "Example",
        websiteAvailability: "public",
        productUrl: "https://example.com",
        productDescription: "A tool for managing work",
        targetAudience: "Small teams",
        auditType: "Landing page",
        biggestConcern: "Visitors do not understand the product",
        auditImprove: "Make the value proposition clearer",
        auditOutcome: "Know which copy changes to make first",
      }).success,
    ).toBe(true);

    expect(
      orderSchemas["paid-audit"].safeParse({
        ...emptyOrderValues,
        email: "not-an-email",
        websiteAvailability: "public",
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
        websiteAvailability: "public",
        productUrl: "https://example.com",
        productDescription: "A tool for managing work",
        targetAudience: "Small teams",
        flowType: "Signup or onboarding flow",
        flowLocation: "After a user creates an account",
        desiredOutcome: "More users complete setup",
        flowNotWorking: "Users do not understand the next step",
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
        websiteAvailability: "no-public-site",
        productUrl: "",
        productDescription: "A new tool for managing work",
        targetAudience: "Small teams",
        activationProblem: "Teams lose track of project work",
        activationGoal: "Reach first project created",
        activationUnderstanding: "Users should know how to start their first project",
        activationOutcome: "More new users create their first project",
      }).success,
    ).toBe(true);
  });

  it("requires a URL for public products but allows new products without one", () => {
    const sharedValues = {
      ...emptyOrderValues,
      name: "Elijah",
      email: "elijah@example.com",
      productName: "Example",
      productDescription: "A tool for managing work",
      targetAudience: "Small teams",
      auditType: "Landing page",
      biggestConcern: "Visitors do not understand the product",
      auditImprove: "Make the value proposition clearer",
      auditOutcome: "Know which copy changes to make first",
    };

    expect(
      orderSchemas["paid-audit"].safeParse({
        ...sharedValues,
        websiteAvailability: "public",
        productUrl: "",
      }).success,
    ).toBe(false);
    expect(
      orderSchemas["paid-audit"].safeParse({
        ...sharedValues,
        websiteAvailability: "no-public-site",
        productUrl: "",
      }).success,
    ).toBe(true);
  });
});

describe("order submission", () => {
  const validValues = {
    ...emptyOrderValues,
    name: "  Elijah Example  ",
    email: "elijah@example.com",
    productName: "Example product",
    websiteAvailability: "public",
    productUrl: "https://example.com",
    productDescription: "A tool for managing work",
    targetAudience: "Small teams",
    auditType: "Landing page",
    biggestConcern: "Visitors do not understand the product",
    auditImprove: "Clarify the value proposition",
    auditOutcome: "Know what to change",
  };

  function createRepository(): OrderRepository {
    return {
      getActiveService: vi.fn().mockResolvedValue({
        id: "paid-audit",
        name: "Paid Audit",
        price: 25,
        currency: "USD",
      }),
      insertOrder: vi.fn().mockResolvedValue("ORD-12345"),
    };
  }

  it("validates details, derives service data, and maps the project brief", async () => {
    const repository = createRepository();
    const result = await createOrderRecord(
      { serviceId: "paid-audit", values: validValues },
      repository,
    );

    expect(result).toEqual({ reference: "ORD-12345" });
    expect(repository.insertOrder).toHaveBeenCalledWith({
      customer_name: "Elijah Example",
      customer_email: "elijah@example.com",
      service_id: "paid-audit",
      service_name: "Paid Audit",
      price: 25,
      currency: "USD",
      project_details: expect.objectContaining({
        productName: "Example product",
        auditType: "Landing page",
      }),
    });
    const insertedOrder = vi.mocked(repository.insertOrder).mock.calls[0]?.[0];
    if (!insertedOrder) throw new Error("Expected an order insert call.");
    expect(insertedOrder.project_details).not.toHaveProperty("name");
    expect(insertedOrder.project_details).not.toHaveProperty("email");
  });

  it("creates Flow Fix orders from the active database service record", async () => {
    const repository = createRepository();
    const flowFixValues = {
      ...emptyOrderValues,
      name: "Elijah Example",
      email: "elijah@example.com",
      productName: "Example product",
      websiteAvailability: "no-public-site",
      productUrl: "",
      productDescription: "A tool for managing work",
      targetAudience: "Small teams",
      flowType: "Signup or onboarding flow",
      flowLocation: "After account creation",
      desiredOutcome: "Complete setup",
      flowNotWorking: "The next action is unclear",
    };
    vi.mocked(repository.getActiveService).mockResolvedValueOnce({
      id: "flow-fix",
      name: "Flow Fix",
      price: "75.00",
      currency: "USD",
    });

    await createOrderRecord({ serviceId: "flow-fix", values: flowFixValues }, repository);

    expect(repository.insertOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        service_id: "flow-fix",
        service_name: "Flow Fix",
        price: 75,
        currency: "USD",
        project_details: expect.objectContaining({
          flowType: "Signup or onboarding flow",
          flowLocation: "After account creation",
          desiredOutcome: "Complete setup",
          flowNotWorking: "The next action is unclear",
        }),
      }),
    );
    const insertedOrder = vi.mocked(repository.insertOrder).mock.calls[0]?.[0];
    if (!insertedOrder) throw new Error("Expected a Flow Fix order insert call.");
    expect(insertedOrder).not.toHaveProperty("payment_status");
    expect(insertedOrder).not.toHaveProperty("project_status");
  });

  it("rejects invalid customer or offer-specific fields before database access", async () => {
    const repository = createRepository();
    await expect(
      createOrderRecord(
        { serviceId: "paid-audit", values: { ...validValues, email: "not-an-email" } },
        repository,
      ),
    ).rejects.toMatchObject({ code: "validation" });
    expect(repository.getActiveService).not.toHaveBeenCalled();
    expect(repository.insertOrder).not.toHaveBeenCalled();
  });

  it("rejects unknown service IDs and untrusted order metadata", async () => {
    const repository = createRepository();
    await expect(
      createOrderRecord({ serviceId: "unknown", values: validValues }, repository),
    ).rejects.toBeInstanceOf(OrderCreationError);
    await expect(
      createOrderRecord(
        { serviceId: "paid-audit", values: validValues, price: 0, payment_status: "paid" },
        repository,
      ),
    ).rejects.toMatchObject({ code: "validation" });
    expect(repository.insertOrder).not.toHaveBeenCalled();
  });

  it("does not insert when the service is inactive or unavailable", async () => {
    const repository = createRepository();
    vi.mocked(repository.getActiveService).mockResolvedValueOnce(null);
    await expect(
      createOrderRecord({ serviceId: "paid-audit", values: validValues }, repository),
    ).rejects.toMatchObject({ code: "service-unavailable" });
    expect(repository.insertOrder).not.toHaveBeenCalled();
  });

  it("returns a safe database failure when insertion fails", async () => {
    const repository = createRepository();
    vi.mocked(repository.insertOrder).mockRejectedValueOnce(new Error("database internals"));
    await expect(
      createOrderRecord({ serviceId: "paid-audit", values: validValues }, repository),
    ).rejects.toThrow("We couldn't create your order. Please try again.");
  });

  it("reports Flow Fix insert metadata without exposing it to the customer", async () => {
    const repository = createRepository();
    const flowFixValues = {
      ...emptyOrderValues,
      name: "Local Flow Fix Diagnostic",
      email: "flowfix-diagnostic@invalid.example",
      productName: "Diagnostic product",
      websiteAvailability: "no-public-site",
      productUrl: "",
      productDescription: "Synthetic test data",
      targetAudience: "Synthetic test data",
      flowType: "Signup or onboarding flow",
      flowLocation: "After account creation",
      desiredOutcome: "Complete setup",
      flowNotWorking: "The next action is unclear",
    };
    const databaseError = Object.assign(new Error("Insert rejected"), {
      code: "23505",
      status: 409,
    });
    const reportError = vi.fn();
    vi.mocked(repository.getActiveService).mockResolvedValueOnce({
      id: "flow-fix",
      name: "Flow Fix",
      price: 75,
      currency: "USD",
    });
    vi.mocked(repository.insertOrder).mockRejectedValueOnce(databaseError);

    await expect(
      createOrderRecord({ serviceId: "flow-fix", values: flowFixValues }, repository, reportError),
    ).rejects.toThrow("We couldn't create your order. Please try again.");

    expect(reportError).toHaveBeenCalledWith("order-insert", databaseError);
  });
});
