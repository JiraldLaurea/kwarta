import { z } from "zod";

export const authSchema = z.object({
    email: z.string().email("Use a valid email address."),
    password: z.string().min(8, "Use at least 8 characters."),
});

export const transactionSchema = z.object({
    type: z.enum(["income", "expense"]),
    amount: z.coerce.number().positive("Enter an amount greater than 0."),
    categoryId: z.string().min(1, "Choose a category."),
    accountId: z.string().optional(),
    subcategory: z.string().min(2, "Choose a subcategory."),
    note: z.string().optional(),
    date: z.string().min(1, "Choose a date."),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Use a valid time."),
});

export const transferSchema = z
    .object({
        fromAccountId: z.string().min(1, "Choose a source account."),
        toAccountId: z.string().min(1, "Choose a destination account."),
        amount: z.coerce.number().positive("Enter an amount greater than 0."),
        fee: z.coerce.number().min(0, "Enter 0 or a positive fee.").default(0),
        note: z.string().optional(),
        date: z.string().min(1, "Choose a date."),
        time: z.string().regex(/^\d{2}:\d{2}$/, "Use a valid time."),
    })
    .refine((values) => values.fromAccountId !== values.toAccountId, {
        message: "Choose two different accounts.",
        path: ["toAccountId"],
    });

// Base, extendable object schema (used by the workspace API via `.extend`).
// `name` is a label here and may be empty for brand accounts (the brand
// supplies the display name); the form schema below enforces a label only
// when no brand is chosen.
export const accountSchema = z.object({
    name: z.string().default(""),
    type: z.enum(["bank", "ewallet", "cash"]),
    color: z.string().min(4, "Choose a color."),
    icon: z.string().min(1, "Choose an icon.").default("wallet"),
    openingBalance: z.coerce.number().min(0, "Enter 0 or a positive balance."),
    provider: z.string().optional(),
    externalId: z.string().optional(),
    syncStatus: z
        .enum(["manual", "linked", "syncing", "error"])
        .default("manual"),
});

// Form-only schema: a label is required when the account has no brand
// provider (i.e. "Other" bank/e-wallet, or Cash).
export const accountFormSchema = accountSchema.superRefine((values, ctx) => {
    if (!values.provider && values.name.trim().length < 2) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Use at least 2 characters.",
            path: ["name"],
        });
    }
});

export const categorySchema = z.object({
    name: z.string().min(2, "Use at least 2 characters."),
    type: z.enum(["income", "expense"]),
    color: z.string().min(4, "Choose a color."),
    icon: z.string().min(1, "Choose an icon.").default("receipt"),
});

export const budgetSchema = z.object({
    categoryId: z.string().min(1, "Choose a category."),
    frequency: z.enum(["monthly", "weekly", "custom"]).default("monthly"),
    limit: z.coerce.number().positive("Enter a budget greater than 0."),
    month: z.string().min(1, "Choose a month."),
    periodEnd: z.string().min(1, "Choose a period."),
    periodStart: z.string().min(1, "Choose a period."),
    reuseBudget: z.boolean().default(true),
});

export type AuthFormValues = z.infer<typeof authSchema>;
export type TransactionFormValues = z.infer<typeof transactionSchema>;
export type CategoryFormValues = z.infer<typeof categorySchema>;
export type BudgetFormValues = z.infer<typeof budgetSchema>;
export type AccountFormValues = z.infer<typeof accountSchema>;
export type TransferFormValues = z.infer<typeof transferSchema>;
