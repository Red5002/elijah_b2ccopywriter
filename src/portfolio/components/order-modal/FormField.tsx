import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFormContext } from "react-hook-form";
import type { OrderFormValues } from "@/lib/orders";

export type OrderFieldDefinition = {
  name: keyof OrderFormValues;
  label: string;
  type: "text" | "email" | "url" | "textarea";
  required: boolean;
  placeholder?: string;
};

type FormFieldProps = OrderFieldDefinition & {
  error?: string;
};

export function FormField({ name, label, type, required, placeholder, error }: FormFieldProps) {
  const { register } = useFormContext<OrderFormValues>();
  const inputId = `order-${name}`;
  const errorId = `${inputId}-error`;
  const registration = register(name);
  const fieldProps = {
    id: inputId,
    required,
    placeholder,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? errorId : undefined,
  };

  return (
    <div className="portfolio-order-field">
      <Label htmlFor={inputId}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </Label>
      {type === "textarea" ? (
        <Textarea {...registration} {...fieldProps} />
      ) : (
        <Input {...registration} {...fieldProps} type={type} />
      )}
      {error ? (
        <p className="portfolio-order-error" id={errorId} aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
