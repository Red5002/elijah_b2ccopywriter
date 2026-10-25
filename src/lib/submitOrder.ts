import { createServerFn } from "@tanstack/react-start";
import { createOrderInputSchema } from "./orderSubmission";

export const submitOrder = createServerFn({ method: "POST" })
  .validator((input) => {
    const result = createOrderInputSchema.safeParse(input);
    if (!result.success) {
      throw new Error("Please review your order details and try again.");
    }
    return result.data;
  })
  .handler(async ({ data }) => {
    const { createOrderWithSupabase } = await import("./submitOrder.server");
    return createOrderWithSupabase(data);
  });
