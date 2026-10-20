import { z } from "zod";

/*
 * Prototype flow: choose an offer, enter its required details, review, then
 * simulate confirmation. Payment and backend order creation are not connected;
 * never collect real client orders through this prototype.
 */

export const orderOffers = {
  "paid-audit": {
    name: "Paid Audit",
    price: 25,
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "productName", label: "Product name", type: "text", required: true },
      { name: "productUrl", label: "Product URL", type: "url", required: true },
      { name: "targetAudience", label: "Target audience", type: "textarea", required: true },
      {
        name: "biggestConcern",
        label: "Biggest concern or problem",
        type: "textarea",
        required: true,
      },
    ],
  },
  "flow-fix": {
    name: "Flow Fix",
    price: 75,
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "productName", label: "Product name", type: "text", required: true },
      { name: "productUrl", label: "Product URL", type: "url", required: true },
      { name: "targetAudience", label: "Target audience", type: "textarea", required: true },
      {
        name: "flowType",
        label: "Type of flow to rewrite",
        type: "text",
        placeholder: "For example: onboarding, checkout, signup, or upgrade",
        required: true,
      },
      {
        name: "existingFlow",
        label: "Existing copy or link to the flow",
        type: "textarea",
        required: true,
      },
      { name: "desiredOutcome", label: "Desired outcome", type: "textarea", required: true },
    ],
  },
  "activation-rewrite": {
    name: "Activation Rewrite",
    price: 195,
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "productName", label: "Product name", type: "text", required: true },
      { name: "productUrl", label: "Product URL", type: "url", required: true },
      { name: "targetAudience", label: "Target audience", type: "textarea", required: true },
      {
        name: "activationGoal",
        label: "Primary activation goal",
        type: "textarea",
        required: true,
      },
      {
        name: "landingCopy",
        label: "Existing landing-page copy",
        type: "textarea",
        required: true,
      },
      {
        name: "welcomeEmail",
        label: "Current welcome email",
        type: "textarea",
        required: false,
      },
      {
        name: "biggestConcern",
        label: "Biggest activation problem",
        type: "textarea",
        required: true,
      },
    ],
  },
} as const;

export type OrderOfferId = keyof typeof orderOffers;

const requiredText = (label: string) => z.string().trim().min(1, `${label} is required.`);

const sharedFields = {
  name: requiredText("Name"),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  productName: requiredText("Product name"),
  productUrl: z.string().trim().min(1, "Product URL is required.").url("Enter a valid URL."),
  targetAudience: requiredText("Target audience"),
};

const optionalTextFields = {
  biggestConcern: z.string(),
  flowType: z.string(),
  existingFlow: z.string(),
  desiredOutcome: z.string(),
  activationGoal: z.string(),
  landingCopy: z.string(),
  welcomeEmail: z.string(),
};

export const orderSchemas = {
  "paid-audit": z.object({
    ...sharedFields,
    ...optionalTextFields,
    biggestConcern: requiredText("Biggest concern or problem"),
  }),
  "flow-fix": z.object({
    ...sharedFields,
    ...optionalTextFields,
    flowType: requiredText("Type of flow"),
    existingFlow: requiredText("Existing copy or flow link"),
    desiredOutcome: requiredText("Desired outcome"),
  }),
  "activation-rewrite": z.object({
    ...sharedFields,
    ...optionalTextFields,
    activationGoal: requiredText("Primary activation goal"),
    landingCopy: requiredText("Existing landing-page copy"),
    biggestConcern: requiredText("Biggest activation problem"),
  }),
} satisfies Record<OrderOfferId, z.ZodType>;

export type OrderFormValues = z.infer<(typeof orderSchemas)["paid-audit"]>;

export const emptyOrderValues: OrderFormValues = {
  name: "",
  email: "",
  productName: "",
  productUrl: "",
  targetAudience: "",
  biggestConcern: "",
  flowType: "",
  existingFlow: "",
  desiredOutcome: "",
  activationGoal: "",
  landingCopy: "",
  welcomeEmail: "",
};
