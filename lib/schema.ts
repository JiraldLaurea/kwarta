import { z } from "zod";

export const authSchema = z.object({
    email: z.string().email("Use a valid email address."),
    password: z.string().min(8, "Use at least 8 characters."),
});

export const transactionSchema = z.object({
    type: z.enum(["income", "expense"]),
    amount: z.coerce.number().positive("Enter an amount greater than 0."),
    categoryId: z.string().min(1, "Choose a category."),
    subcategory: z.string().min(2, "Choose a subcategory."),
    note: z.string().optional(),
    date: z.string().min(1, "Choose a date."),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Use a valid time."),
});

export const categorySchema = z.object({
    name: z.string().min(2, "Use at least 2 characters."),
    type: z.enum(["income", "expense"]),
    color: z.string().min(4, "Choose a color."),
    icon: z.string().min(1, "Choose an icon.").default("receipt"),
});

export const budgetSchema = z.object({
    categoryId: z.string().min(1, "Choose a category."),
    limit: z.coerce.number().positive("Enter a budget greater than 0."),
    month: z.string().min(1, "Choose a month."),
    reuseBudget: z.boolean().default(true),
});

export type AuthFormValues = z.infer<typeof authSchema>;
export type TransactionFormValues = z.infer<typeof transactionSchema>;
export type CategoryFormValues = z.infer<typeof categorySchema>;
export type BudgetFormValues = z.infer<typeof budgetSchema>;
