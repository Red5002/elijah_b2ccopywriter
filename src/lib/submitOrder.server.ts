import "@tanstack/react-start/server-only";

import { createClient } from "@supabase/supabase-js";
import { createOrderRecord, OrderCreationError, type OrderRepository } from "./orderSubmission";

function getSubmittedValues(input: unknown): string[] {
  if (input === null || typeof input !== "object" || !("values" in input)) return [];
  const values = input.values;
  if (values === null || typeof values !== "object") return [];
  return Object.values(values).filter((value): value is string => typeof value === "string");
}

function getSensitiveValues(input: unknown): string[] {
  return [
    ...getSubmittedValues(input),
    import.meta.env["VITE_SUPABASE_URL"],
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"],
    process.env["SUPABASE_SERVICE_ROLE_KEY"],
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
}

function safeErrorMessage(error: unknown, input: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown server-side order error";
  const redactedMessage = getSensitiveValues(input)
    .sort((left, right) => right.length - left.length)
    .reduce((safe, value) => {
      const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = value.length < 3 ? `\\b${escapedValue}\\b` : escapedValue;
      return safe.replace(new RegExp(pattern, "gi"), "[redacted]");
    }, message)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer [redacted]")
    .replace(/((?:authorization|apikey|api_key)\s*[:=]\s*["']?)[^,"'\s}]+/gi, "$1[redacted]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted-token]");
  return redactedMessage.slice(0, 500);
}

function logOrderFailure(operation: string, error: unknown, input: unknown) {
  const details = error !== null && typeof error === "object" ? error : {};
  const code = "code" in details && typeof details.code === "string" ? details.code : undefined;
  const status =
    "status" in details && typeof details.status === "number"
      ? details.status
      : "statusCode" in details && typeof details.statusCode === "number"
        ? details.statusCode
        : undefined;

  console.error("[order-submission] server failure", {
    operation,
    name: error instanceof Error ? error.name : typeof error,
    message: safeErrorMessage(error, input),
    ...(code ? { code } : {}),
    ...(status !== undefined ? { status } : {}),
  });
}

export async function createOrderWithSupabase(input: unknown) {
  const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"];
  const publishableKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    const missingVariables = [
      !supabaseUrl ? "VITE_SUPABASE_URL" : null,
      !publishableKey ? "VITE_SUPABASE_PUBLISHABLE_KEY" : null,
      !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
    ].filter((name): name is string => name !== null);
    logOrderFailure(
      "configuration",
      new Error(`Missing server configuration: ${missingVariables.join(", ")}`),
      input,
    );
    throw new OrderCreationError("database");
  }

  try {
    const publicClient = createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const repository: OrderRepository = {
      async getActiveService(serviceId) {
        const { data, error } = await publicClient
          .from("services")
          .select("id, name, price, currency")
          .eq("id", serviceId)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
      async insertOrder(order) {
        const { data, error } = await adminClient
          .from("orders")
          .insert(order)
          .select("reference")
          .single();
        if (error) throw error;
        return typeof data.reference === "string" ? data.reference : null;
      },
    };

    return await createOrderRecord(input, repository, (operation, error) => {
      logOrderFailure(operation, error, input);
    });
  } catch (error) {
    if (error instanceof OrderCreationError) throw error;
    logOrderFailure("supabase-client", error, input);
    throw new OrderCreationError("database");
  }
}
