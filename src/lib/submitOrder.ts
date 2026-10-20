import type { OrderFormValues, OrderOfferId } from "@/lib/orders";

export type MockOrder = {
  offer: OrderOfferId;
  values: OrderFormValues;
};

export async function submitMockOrder(order: MockOrder): Promise<{ confirmationId: string }> {
  // TODO: Replace this prototype with backend order creation and payment integration.
  void order;
  await new Promise((resolve) => window.setTimeout(resolve, 700));

  // Add ?mockOrderFailure=1 in development to exercise the failure and retry state.
  if (
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("mockOrderFailure") === "1"
  ) {
    throw new Error("The simulated order could not be created. Please try again.");
  }

  return { confirmationId: `TEST-${Date.now().toString(36).toUpperCase()}` };
}
