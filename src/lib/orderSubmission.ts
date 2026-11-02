import { z } from "zod";
import { orderOffers, orderSchemas, type OrderOfferId } from "./orders";

export const createOrderInputSchema = z
  .object({
    serviceId: z.enum(["paid-audit", "flow-fix", "activation-rewrite"]),
    submissionKey: z
      .string()
      .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
    values: z.record(z.string(), z.unknown()),
  })
  .strict();

export type CreatedOrder = {
  id: string;
  reference: string;
};

type ExistingOrder = CreatedOrder & {
  service_id: string;
  customer_name: string;
  customer_email: string;
  project_details: Record<string, string>;
};

type ServiceRecord = {
  id: string;
  name: string;
  price: number | string;
  currency: string;
};

type NewOrderRecord = {
  customer_name: string;
  customer_email: string;
  service_id: string;
  service_name: string;
  price: number;
  currency: string;
  project_details: Record<string, string>;
  submission_key: string;
};

export type OrderRepository = {
  getActiveService: (serviceId: OrderOfferId) => Promise<ServiceRecord | null>;
  getOrderBySubmissionKey: (submissionKey: string) => Promise<ExistingOrder | null>;
  insertOrder: (order: NewOrderRecord) => Promise<CreatedOrder | null>;
};

export type OrderErrorReporter = (operation: string, error: unknown) => void;

type OrderCreationErrorCode = "validation" | "service-unavailable" | "database";

const orderCreationMessages: Record<OrderCreationErrorCode, string> = {
  validation: "Please review your order details and try again.",
  "service-unavailable": "This service is currently unavailable. Please refresh and try again.",
  database: "We couldn't create your order. Please try again.",
};

export class OrderCreationError extends Error {
  constructor(readonly code: OrderCreationErrorCode) {
    super(orderCreationMessages[code]);
    this.name = "OrderCreationError";
  }
}

function sameProjectDetails(
  existing: Record<string, string>,
  submitted: Record<string, string>,
): boolean {
  const keys = Object.keys(submitted);
  return (
    keys.length === Object.keys(existing).length &&
    keys.every((key) => existing[key] === submitted[key])
  );
}

export async function createOrderRecord(
  input: unknown,
  repository: OrderRepository,
  reportError?: OrderErrorReporter,
) {
  const request = createOrderInputSchema.safeParse(input);
  if (!request.success) throw new OrderCreationError("validation");

  const { serviceId, submissionKey, values } = request.data;
  const form = orderSchemas[serviceId].safeParse(values);
  if (!form.success) throw new OrderCreationError("validation");

  const submittedValues = form.data as Record<string, string>;
  const customerName = form.data.name;
  const customerEmail = form.data.email;
  const projectDetails = Object.fromEntries(
    orderOffers[serviceId].fields
      .filter((field) => field.name !== "name" && field.name !== "email")
      .map((field) => [field.name, submittedValues[field.name] ?? ""]),
  );

  let existingOrder: ExistingOrder | null;
  try {
    existingOrder = await repository.getOrderBySubmissionKey(submissionKey);
  } catch (error) {
    reportError?.("order-idempotency-lookup", error);
    throw new OrderCreationError("database");
  }

  if (existingOrder) {
    if (
      existingOrder.service_id !== serviceId ||
      existingOrder.customer_name !== customerName ||
      existingOrder.customer_email.toLowerCase() !== customerEmail.toLowerCase() ||
      !sameProjectDetails(existingOrder.project_details, projectDetails)
    ) {
      throw new OrderCreationError("validation");
    }
    return { id: existingOrder.id, reference: existingOrder.reference };
  }

  let service: ServiceRecord | null;
  try {
    service = await repository.getActiveService(serviceId);
  } catch (error) {
    reportError?.("service-lookup", error);
    throw new OrderCreationError("database");
  }
  if (!service || service.id !== serviceId) {
    throw new OrderCreationError("service-unavailable");
  }

  const price = Number(service.price);
  if (!service.name.trim() || !service.currency.trim() || !Number.isFinite(price) || price <= 0) {
    throw new OrderCreationError("database");
  }

  let createdOrder: CreatedOrder | null;
  try {
    createdOrder = await repository.insertOrder({
      customer_name: customerName,
      customer_email: customerEmail,
      service_id: service.id,
      service_name: service.name,
      price,
      currency: service.currency,
      project_details: projectDetails,
      submission_key: submissionKey,
    });
  } catch (error) {
    const isUniqueConflict =
      typeof error === "object" &&
      error !== null &&
      Reflect.get(error, "code") === "23505";
    if (isUniqueConflict) {
      try {
        const existingOrder = await repository.getOrderBySubmissionKey(submissionKey);
        if (
          existingOrder &&
          existingOrder.service_id === serviceId &&
          existingOrder.customer_name === customerName &&
          existingOrder.customer_email.toLowerCase() === customerEmail.toLowerCase() &&
          sameProjectDetails(existingOrder.project_details, projectDetails)
        ) {
          return { id: existingOrder.id, reference: existingOrder.reference };
        }
      } catch (lookupError) {
        reportError?.("order-idempotency-lookup", lookupError);
        throw new OrderCreationError("database");
      }
    }
    reportError?.("order-insert", error);
    throw new OrderCreationError("database");
  }
  if (!createdOrder?.id || !createdOrder.reference) throw new OrderCreationError("database");

  return createdOrder;
}
