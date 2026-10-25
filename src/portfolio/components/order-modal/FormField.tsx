import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFormContext } from "react-hook-form";
import type { OrderFormValues } from "@/lib/orders";

export type OrderFieldDefinition = {
  name: keyof OrderFormValues;
  label: string;
  type: "text" | "email" | "url" | "textarea" | "select";
  required: boolean;
  placeholder?: string;
  helpText?: string;
  requiredWhen?: { field: keyof OrderFormValues; value: string };
  options?: readonly { value: string; label: string }[];
};

type FormFieldProps = OrderFieldDefinition & {
  error?: string;
};

export function FormField({
  name,
  label,
  type,
  required,
  placeholder,
  helpText,
  requiredWhen,
  options,
  error,
}: FormFieldProps) {
  const { register, watch } = useFormContext<OrderFormValues>();
  const inputId = `order-${name}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const isRequired =
    required || (requiredWhen !== undefined && watch(requiredWhen.field) === requiredWhen.value);
  const describedBy = [helpText ? helpId : null, error ? errorId : null].filter(Boolean).join(" ");
  const registration = register(name);
  const fieldProps = {
    id: inputId,
    required: isRequired,
    placeholder,
    "aria-invalid": Boolean(error),
    "aria-describedby": describedBy || undefined,
  };

  return (
    <div className="portfolio-order-field">
      <Label htmlFor={inputId}>
        {label}{" "}
        <span className="portfolio-order-field-status">{isRequired ? "Required" : "Optional"}</span>
      </Label>
      {type === "textarea" ? (
        <Textarea {...registration} {...fieldProps} />
      ) : type === "select" ? (
        <select {...registration} {...fieldProps}>
          <option value="">{placeholder ?? "Choose an option"}</option>
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <Input {...registration} {...fieldProps} type={type} />
      )}
      {helpText ? (
        <p className="portfolio-order-help" id={helpId}>
          {helpText}
        </p>
      ) : null}
      {error ? (
        <p className="portfolio-order-error" id={errorId} aria-live="polite">
          {error}
        </p>
      ) : null}
    </div>
  );
}
