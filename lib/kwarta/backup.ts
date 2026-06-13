import { z } from "zod";
import { categorySchema, transactionSchema } from "@/lib/schema";
import type { Budget, Category, Transaction, TransactionType } from "@/lib/types";
import {
    normalizeTimeValue,
    normalizeTransactionType,
    slugifyCategoryValue,
    toMonthInputValue,
} from "@/lib/kwarta/helpers";

export type TransactionImportResult = {
    categories: Category[];
    transactions: Transaction[];
};

const transactionBackupRecordSchema = transactionSchema
    .extend({
        id: z.string().min(1),
        merchant: z.string().optional(),
        note: z.string().optional(),
        subcategory: z.string().optional(),
        time: z.string().optional(),
    })
    .transform(({ merchant, ...transaction }) => ({
        ...transaction,
        subcategory: transaction.subcategory ?? merchant ?? "",
        time: normalizeTimeValue(transaction.time),
    }));

const budgetBackupRecordSchema = z
    .object({
        id: z.string().optional(),
        category: z.string().optional(),
        categoryId: z.string().optional(),
        categoryName: z.string().optional(),
        categoryType: z.string().optional(),
        name: z.string().optional(),
        limit: z.unknown().optional(),
        amount: z.unknown().optional(),
        budget: z.unknown().optional(),
        value: z.unknown().optional(),
        date: z.string().optional(),
        month: z.string().optional(),
        period: z.string().optional(),
    })
    .passthrough();

const backupCategoryRecordSchema = categorySchema.extend({
    id: z.string().min(1),
});

const transactionBackupSchema = z.union([
    z.array(transactionBackupRecordSchema),
    z.object({
        type: z.string().optional(),
        exportedAt: z.string().optional(),
        categories: z.array(backupCategoryRecordSchema).optional(),
        transactions: z.array(transactionBackupRecordSchema),
    }),
]);

const budgetBackupSchema = z.union([
    z.array(budgetBackupRecordSchema),
    z.object({
        type: z.string().optional(),
        exportedAt: z.string().optional(),
        categories: z.array(backupCategoryRecordSchema).optional(),
        budgets: z.array(budgetBackupRecordSchema),
    }),
]);

function findMatchingCategoryId(
    categoryId: string,
    categoryType: TransactionType,
    categories: Category[],
    backupCategories: Category[] = [],
) {
    const availableCategories = categories.filter(
        (category) => normalizeTransactionType(category.type) === categoryType,
    );
    const currentCategory = categories.find(
        (category) =>
            category.id === categoryId &&
            normalizeTransactionType(category.type) === categoryType,
    );

    if (currentCategory) {
        return currentCategory.id;
    }

    const backupCategory = backupCategories.find(
        (category) =>
            category.id === categoryId ||
            slugifyCategoryValue(category.name) ===
                slugifyCategoryValue(categoryId),
    );
    const backupCategoryName = backupCategory?.name ?? categoryId;
    const matchingCategory = availableCategories.find(
        (category) =>
            category.id === categoryId ||
            slugifyCategoryValue(category.name) ===
                slugifyCategoryValue(backupCategoryName),
    );

    return matchingCategory?.id ?? availableCategories[0]?.id ?? categoryId;
}

function mergeBackupCategories(
    categories: Category[],
    backupCategories: Category[],
) {
    const nextCategories = categories.slice();

    backupCategories.forEach((backupCategory) => {
        const categoryType = normalizeTransactionType(backupCategory.type);
        const existingCategory = nextCategories.find(
            (category) =>
                normalizeTransactionType(category.type) === categoryType &&
                slugifyCategoryValue(category.name) ===
                    slugifyCategoryValue(backupCategory.name),
        );

        if (existingCategory) {
            return;
        }

        const idExists = nextCategories.some(
            (category) => category.id === backupCategory.id,
        );
        nextCategories.push({
            ...backupCategory,
            id: idExists ? crypto.randomUUID() : backupCategory.id,
        });
    });

    return nextCategories;
}

export function parseTransactionBackupPayload(
    payload: unknown,
    categories: Category[],
): TransactionImportResult {
    const parsed = transactionBackupSchema.safeParse(payload);

    if (!parsed.success) {
        throw new Error("Invalid transactions backup.");
    }

    const records = Array.isArray(parsed.data)
        ? parsed.data
        : parsed.data.transactions;
    const backupCategories = Array.isArray(parsed.data)
        ? []
        : (parsed.data.categories ?? []);
    const nextCategories = mergeBackupCategories(categories, backupCategories);

    return {
        categories: nextCategories,
        transactions: records.map((transaction) => ({
            ...transaction,
            id: crypto.randomUUID(),
            categoryId: findMatchingCategoryId(
                transaction.categoryId,
                normalizeTransactionType(transaction.type),
                nextCategories,
                backupCategories,
            ),
            note: transaction.note ?? "",
            time: normalizeTimeValue(transaction.time),
        })),
    };
}

function parseBackupAmount(value: unknown) {
    if (typeof value === "number") {
        return value;
    }

    if (typeof value === "string") {
        const parsed = Number(value.replace(/[^0-9.-]/g, ""));
        return Number.isFinite(parsed) ? parsed : 0;
    }

    return 0;
}

function normalizeBackupMonth(value: string | undefined) {
    if (!value) {
        return "";
    }

    const trimmed = value.trim();
    const monthMatch = trimmed.match(/^(\d{4})-(\d{2})/);

    if (monthMatch) {
        return `${monthMatch[1]}-${monthMatch[2]}`;
    }

    const parsed = new Date(trimmed);

    if (Number.isNaN(parsed.getTime())) {
        return trimmed;
    }

    return toMonthInputValue(parsed);
}

export function parseBudgetBackupPayload(
    payload: unknown,
    categories: Category[],
): Budget[] {
    const parsed = budgetBackupSchema.safeParse(payload);

    if (!parsed.success) {
        throw new Error("Invalid budgets backup.");
    }

    const records = Array.isArray(parsed.data)
        ? parsed.data
        : parsed.data.budgets;
    const backupCategories = Array.isArray(parsed.data)
        ? []
        : (parsed.data.categories ?? []);

    const budgets = records.map((budget) => {
        const categoryKey =
            budget.categoryName ??
            budget.category ??
            budget.name ??
            budget.categoryId ??
            "";
        const limit = parseBackupAmount(
            budget.limit ?? budget.amount ?? budget.budget ?? budget.value,
        );
        const month = normalizeBackupMonth(
            budget.month ?? budget.period ?? budget.date,
        );

        return {
            id: crypto.randomUUID(),
            categoryId: findMatchingCategoryId(
                categoryKey,
                "expense",
                categories,
                backupCategories,
            ),
            limit,
            month,
        };
    });

    if (
        budgets.some(
            (budget) =>
                !budget.categoryId ||
                !Number.isFinite(budget.limit) ||
                budget.limit <= 0 ||
                !budget.month,
        )
    ) {
        throw new Error("Invalid budgets backup.");
    }

    return budgets;
}

export function downloadBackupFile(
    label: "transactions" | "budgets",
    records: Transaction[] | Budget[],
    categories: Category[],
) {
    const categoryLookup = new Map(
        categories.map((category) => [category.id, category]),
    );
    const payload =
        label === "budgets"
            ? (records as Budget[]).map((budget) => {
                  const category = categoryLookup.get(budget.categoryId);

                  return {
                      ...budget,
                      categoryName: category?.name ?? "",
                      categoryType: category?.type ?? "expense",
                  };
              })
            : {
                  type: "kwarta-transactions",
                  exportedAt: new Date().toISOString(),
                  categories,
                  transactions: records,
              };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kwarta-${label}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
}
