import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import type { OrderFormValues } from "@/lib/orders";
import { FormField, type OrderFieldDefinition } from "./FormField";

type OrderFormProps = {
  fields: readonly OrderFieldDefinition[];
  onContinue: (values: OrderFormValues) => void;
  onValidationError: () => void;
};

export function OrderForm({ fields, onContinue, onValidationError }: OrderFormProps) {
  const {
    handleSubmit,
    formState: { errors },
  } = useFormContext<OrderFormValues>();

  return (
    <form
      className="portfolio-order-form"
      noValidate
      onSubmit={handleSubmit(onContinue, onValidationError)}
    >
      <div className="portfolio-order-fields">
        {fields.map((field) => {
          const error = errors[field.name]?.message;
          return (
            <FormField
              key={field.name}
              {...field}
              error={typeof error === "string" ? error : undefined}
            />
          );
        })}
      </div>
      <Button variant="portfolio" className="btn btn-primary portfolio-order-action" type="submit">
        {"Review order"}
      </Button>
    </form>
  );
}
