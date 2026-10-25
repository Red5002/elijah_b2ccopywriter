import { z } from "zod";

const requiredText = (label: string) => z.string().trim().min(1, `${label} is required.`);
const optionalText = z.string().trim();
const requiredChoice = (label: string, choices: readonly string[]) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .refine((value) => choices.some((choice) => choice === value), `Choose a valid ${label}.`);

const websiteAvailabilityChoices = ["public", "no-public-site"] as const;
const auditChoices = [
  "Landing page",
  "Signup or onboarding flow",
  "Welcome email",
  "In-app messaging",
  "Cancellation flow",
  "Other",
] as const;
const flowChoices = [
  "Signup or onboarding flow",
  "Welcome email",
  "Empty state",
  "Cancellation flow",
  "In-app messaging",
  "Other",
] as const;

const sharedFieldDefinitions = [
  { name: "name", label: "Full name", type: "text", required: true, placeholder: "Your name" },
  {
    name: "email",
    label: "Email address",
    type: "email",
    required: true,
    placeholder: "you@example.com",
  },
  {
    name: "productName",
    label: "Company or product name",
    type: "text",
    required: true,
    placeholder: "Your company or product",
  },
  {
    name: "websiteAvailability",
    label: "Is a public product website available?",
    type: "select",
    required: true,
    placeholder: "Choose an option",
    options: [
      { value: "public", label: "Yes, there is a public website" },
      { value: "no-public-site", label: "No, the product is not public yet" },
    ],
  },
  {
    name: "productUrl",
    label: "Product website or relevant URL",
    type: "url",
    required: false,
    requiredWhen: { field: "websiteAvailability", value: "public" },
    placeholder: "https://example.com",
    helpText:
      "Required when a public website is available. Otherwise, describe the product and share any useful references below.",
  },
  {
    name: "productDescription",
    label: "Briefly describe your product",
    type: "textarea",
    required: true,
    placeholder: "What does it do, and what makes it useful?",
  },
  {
    name: "targetAudience",
    label: "Who is your target audience?",
    type: "textarea",
    required: true,
    placeholder: "Who uses or should use this product?",
  },
] as const;

export const orderOffers = {
  "paid-audit": {
    name: "Paid Audit",
    price: 25,
    fields: [
      ...sharedFieldDefinitions,
      {
        name: "auditType",
        label: "What would you like me to audit?",
        type: "select",
        required: true,
        placeholder: "Choose an experience",
        options: auditChoices.map((choice) => ({ value: choice, label: choice })),
      },
      {
        name: "biggestConcern",
        label: "What problem are you noticing with this experience?",
        type: "textarea",
        required: true,
        placeholder: "Describe the friction or behavior you are seeing.",
      },
      {
        name: "auditImprove",
        label: "What would you like to improve?",
        type: "textarea",
        required: true,
        placeholder: "For example, clarity, signups, or completing a key action.",
      },
      {
        name: "auditOutcome",
        label: "What outcome would make this audit valuable to you?",
        type: "textarea",
        required: true,
        placeholder: "What would you like to know or be able to change afterward?",
      },
      {
        name: "additionalContext",
        label: "Additional context or reference links",
        type: "textarea",
        required: false,
        placeholder: "Optional: add links, examples, or anything else that may help.",
      },
    ],
  },
  "flow-fix": {
    name: "Flow Fix",
    price: 75,
    fields: [
      ...sharedFieldDefinitions,
      {
        name: "flowType",
        label: "Which flow needs fixing?",
        type: "select",
        required: true,
        placeholder: "Choose one flow",
        options: flowChoices.map((choice) => ({ value: choice, label: choice })),
      },
      {
        name: "flowLocation",
        label: "Where does this experience appear in your product?",
        type: "textarea",
        required: true,
        placeholder: "Describe how a user gets to this screen or message.",
      },
      {
        name: "existingFlow",
        label: "What does the current copy say?",
        type: "textarea",
        required: false,
        placeholder: "Optional: paste the existing wording if you have it.",
      },
      {
        name: "desiredOutcome",
        label: "What should users understand or do after this flow?",
        type: "textarea",
        required: true,
        placeholder: "Describe the one action or understanding you want to support.",
      },
      {
        name: "flowNotWorking",
        label: "What isn't working with the current experience?",
        type: "textarea",
        required: true,
        placeholder: "What are users confused by, missing, or not doing?",
      },
      {
        name: "brandVoice",
        label: "Preferred brand voice or tone",
        type: "text",
        required: false,
        placeholder: "Optional: e.g. warm, direct, playful",
      },
      {
        name: "additionalContext",
        label: "Reference links or additional context",
        type: "textarea",
        required: false,
        placeholder: "Optional: add relevant links or examples.",
      },
    ],
  },
  "activation-rewrite": {
    name: "Activation Rewrite",
    price: 195,
    fields: [
      ...sharedFieldDefinitions,
      {
        name: "activationProblem",
        label: "What primary problem does your product solve?",
        type: "textarea",
        required: true,
        placeholder: "What important problem brings users to your product?",
      },
      {
        name: "activationGoal",
        label: "What is the first meaningful action a new user should take?",
        type: "textarea",
        required: true,
        placeholder: "Name the first action that shows a user is getting value.",
      },
      {
        name: "activationUnderstanding",
        label: "What should users understand before taking that action?",
        type: "textarea",
        required: true,
        placeholder: "What do they need to know or feel confident about?",
      },
      {
        name: "biggestConcern",
        label: "What difficulties do users currently encounter during onboarding?",
        type: "textarea",
        required: false,
        placeholder: "Optional: describe where users get stuck or drop off.",
      },
      {
        name: "activationOutcome",
        label: "What outcome would make this project successful for you?",
        type: "textarea",
        required: true,
        placeholder: "What change would tell you the rewrite is working?",
      },
      {
        name: "landingCopy",
        label: "Current hero headline and supporting copy",
        type: "textarea",
        required: false,
        placeholder: "Optional: paste the current hero headline and supporting copy.",
      },
      {
        name: "emptyStateCopy",
        label: "Current empty-state copy",
        type: "textarea",
        required: false,
        placeholder: "Optional: paste the current empty-state wording.",
      },
      {
        name: "welcomeEmail",
        label: "Current welcome email",
        type: "textarea",
        required: false,
        placeholder: "Optional: paste the current welcome email.",
      },
      {
        name: "brandVoice",
        label: "Preferred brand voice or tone",
        type: "text",
        required: false,
        placeholder: "Optional: e.g. warm, direct, playful",
      },
      {
        name: "avoidMessaging",
        label: "Words, claims, or messaging to avoid",
        type: "textarea",
        required: false,
        placeholder: "Optional: list any language or claims to avoid.",
      },
      {
        name: "additionalContext",
        label: "Reference links or additional context",
        type: "textarea",
        required: false,
        placeholder: "Optional: add relevant links or examples.",
      },
    ],
  },
} as const;

export type OrderOfferId = keyof typeof orderOffers;

const sharedFields = {
  name: requiredText("Name"),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  productName: requiredText("Product name"),
  websiteAvailability: requiredChoice("website availability", websiteAvailabilityChoices),
  productUrl: z
    .string()
    .trim()
    .refine(
      (value) => value.length === 0 || z.string().url().safeParse(value).success,
      "Enter a valid URL.",
    ),
  productDescription: requiredText("Product description"),
  targetAudience: requiredText("Target audience"),
};

const optionalTextFields = {
  auditType: optionalText,
  biggestConcern: optionalText,
  auditImprove: optionalText,
  auditOutcome: optionalText,
  additionalContext: optionalText,
  flowType: optionalText,
  flowLocation: optionalText,
  existingFlow: optionalText,
  desiredOutcome: optionalText,
  flowNotWorking: optionalText,
  brandVoice: optionalText,
  activationProblem: optionalText,
  activationGoal: optionalText,
  activationUnderstanding: optionalText,
  activationOutcome: optionalText,
  landingCopy: optionalText,
  emptyStateCopy: optionalText,
  welcomeEmail: optionalText,
  avoidMessaging: optionalText,
};

const orderSchema = (overrides: Partial<Record<keyof typeof optionalTextFields, z.ZodType>>) => {
  const schema = z.object({ ...sharedFields, ...optionalTextFields, ...overrides });
  return schema.superRefine((values, context) => {
    if (values.websiteAvailability === "public" && !values.productUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["productUrl"],
        message: "A product URL is required when a public website is available.",
      });
    }
  });
};

export const orderSchemas = {
  "paid-audit": orderSchema({
    auditType: requiredChoice("audit type", auditChoices),
    biggestConcern: requiredText("Biggest concern or problem"),
    auditImprove: requiredText("What you would like to improve"),
    auditOutcome: requiredText("Valuable audit outcome"),
  }),
  "flow-fix": orderSchema({
    flowType: requiredChoice("flow type", flowChoices),
    flowLocation: requiredText("Flow location"),
    desiredOutcome: requiredText("Desired outcome"),
    flowNotWorking: requiredText("What is not working"),
  }),
  "activation-rewrite": orderSchema({
    activationProblem: requiredText("Primary product problem"),
    activationGoal: requiredText("Primary activation goal"),
    activationUnderstanding: requiredText("What users should understand"),
    activationOutcome: requiredText("Successful project outcome"),
  }),
} satisfies Record<OrderOfferId, z.ZodType>;

export type OrderFormValues = z.infer<(typeof orderSchemas)["paid-audit"]>;

export const emptyOrderValues: OrderFormValues = {
  name: "",
  email: "",
  productName: "",
  websiteAvailability: "",
  productUrl: "",
  productDescription: "",
  targetAudience: "",
  auditType: "",
  biggestConcern: "",
  auditImprove: "",
  auditOutcome: "",
  additionalContext: "",
  flowType: "",
  flowLocation: "",
  existingFlow: "",
  desiredOutcome: "",
  flowNotWorking: "",
  brandVoice: "",
  activationProblem: "",
  activationGoal: "",
  activationUnderstanding: "",
  activationOutcome: "",
  landingCopy: "",
  emptyStateCopy: "",
  welcomeEmail: "",
  avoidMessaging: "",
};
