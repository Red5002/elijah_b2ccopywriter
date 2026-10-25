import { z } from "zod";
import { orderOffers, orderSchemas, type OrderOfferId } from "./orders";

export const createOrderInputSchema = z
  .object({
    serviceId: z.enum(["paid-audit", "flow-fix", "activation-rewrite"]),
    values: z.record(z.string(), z.unknown()),
  })
  .strict();

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
};

export type OrderRepository = {
  getActiveService: (serviceId: OrderOfferId) => Promise<ServiceRecord | null>;
  insertOrder: (order: NewOrderRecord) => Promise<string | null>;
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

export async function createOrderRecord(
  input: unknown,
  repository: OrderRepository,
  reportError?: OrderErrorReporter,
) {
  const request = createOrderInputSchema.safeParse(input);
  if (!request.success) throw new OrderCreationError("validation");

  const { serviceId, values } = request.data;
  const form = orderSchemas[serviceId].safeParse(values);
  if (!form.success) throw new OrderCreationError("validation");

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
  if (!service.name.trim() || !service.currency.trim() || !Number.isFinite(price) || price < 0) {
    throw new OrderCreationError("database");
  }

  const submittedValues = form.data as Record<string, string>;
  const customerName = form.data.name;
  const customerEmail = form.data.email;
  const projectDetails = Object.fromEntries(
    orderOffers[serviceId].fields
      .filter((field) => field.name !== "name" && field.name !== "email")
      .map((field) => [field.name, submittedValues[field.name] ?? ""]),
  );

  let reference: string | null;
  try {
    reference = await repository.insertOrder({
      customer_name: customerName,
      customer_email: customerEmail,
      service_id: service.id,
      service_name: service.name,
      price,
      currency: service.currency,
      project_details: projectDetails,
    });
  } catch (error) {
    reportError?.("order-insert", error);
    throw new OrderCreationError("database");
  }
  if (!reference) throw new OrderCreationError("database");

  return { reference };
}
