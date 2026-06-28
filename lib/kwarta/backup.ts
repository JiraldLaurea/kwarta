import { z } from "zod";
import {
    accountSchema,
    categorySchema,
    transactionSchema,
} from "@/lib/schema";
import type {
    Account,
    Budget,
    Category,
    Transaction,
    TransactionType,
    Transfer,
} from "@/lib/types";
import {
    getMonthRange,
    normalizeTimeValue,
    normalizeTransactionType,
    slugifyCategoryValue,
    type PeriodFrequency,
    toMonthInputValue,
    withCategoryIcons,
} from "@/lib/kwarta/helpers";

export type TransactionImportResult = {
    categories: Category[];
    transactions: Transaction[];
};

export type WorkspaceBackup = {
    accounts: Account[];
    budgets: Budget[];
    categories: Category[];
    transactions: Transaction[];
    transfers: Transfer[];
};

export type WorkspaceBackupPayload = WorkspaceBackup & {
    exportedAt: string;
    type: "kwarta-workspace";
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
        frequency: z.enum(["monthly", "weekly", "cycle"]).optional(),
        month: z.string().optional(),
        period: z.string().optional(),
        periodEnd: z.string().optional(),
        periodStart: z.string().optional(),
    })
    .passthrough();

const backupCategoryRecordSchema = categorySchema.extend({
    id: z.string().min(1),
    subcategories: z.array(z.string()).optional(),
});

const accountBackupRecordSchema = accountSchema.extend({
    id: z.string().min(1),
});

const transferBackupRecordSchema = z
    .object({
        id: z.string().min(1),
        fromAccountId: z.string().min(1),
        toAccountId: z.string().min(1),
        amount: z.coerce.number().positive(),
        fee: z.coerce.number().min(0).default(0),
        note: z.string().optional(),
        date: z.string().min(1),
        time: z.string().regex(/^\d{2}:\d{2}$/),
    })
    .refine((values) => values.fromAccountId !== values.toAccountId);

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

const workspaceBackupSchema = z.object({
    type: z.string().optional(),
    exportedAt: z.string().optional(),
    accounts: z.array(accountBackupRecordSchema),
    budgets: z.array(budgetBackupRecordSchema),
    categories: z.array(backupCategoryRecordSchema),
    transactions: z.array(transactionBackupRecordSchema),
    transfers: z.array(transferBackupRecordSchema).default([]),
});

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
    const nextCategories = withCategoryIcons(
        mergeBackupCategories(categories, backupCategories),
    );

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
        const frequency = (budget.frequency ?? "monthly") as PeriodFrequency;
        const month = normalizeBackupMonth(
            budget.month ?? budget.period ?? budget.periodStart ?? budget.date,
        );
        const fallbackRange = getMonthRange(month);

        return {
            id: crypto.randomUUID(),
            categoryId: findMatchingCategoryId(
                categoryKey,
                "expense",
                categories,
                backupCategories,
            ),
            frequency,
            limit,
            month,
            periodEnd: budget.periodEnd ?? fallbackRange.endDate,
            periodStart: budget.periodStart ?? fallbackRange.startDate,
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

function normalizeBackupBudgets(
    records: z.infer<typeof budgetBackupRecordSchema>[],
    categories: Category[],
    backupCategories: Category[] = [],
) {
    return records.map((budget) => {
        const categoryKey =
            budget.categoryName ??
            budget.category ??
            budget.name ??
            budget.categoryId ??
            "";
        const limit = parseBackupAmount(
            budget.limit ?? budget.amount ?? budget.budget ?? budget.value,
        );
        const frequency = (budget.frequency ?? "monthly") as PeriodFrequency;
        const month = normalizeBackupMonth(
            budget.month ?? budget.period ?? budget.periodStart ?? budget.date,
        );
        const fallbackRange = getMonthRange(month);

        return {
            id: crypto.randomUUID(),
            categoryId: findMatchingCategoryId(
                categoryKey,
                "expense",
                categories,
                backupCategories,
            ),
            frequency,
            limit,
            month,
            periodEnd: budget.periodEnd ?? fallbackRange.endDate,
            periodStart: budget.periodStart ?? fallbackRange.startDate,
        };
    });
}

export function parseWorkspaceBackupPayload(
    payload: unknown,
    currentWorkspace: WorkspaceBackup,
): WorkspaceBackup {
    const parsed = workspaceBackupSchema.safeParse(payload);

    if (!parsed.success) {
        const transactionBackup = transactionBackupSchema.safeParse(payload);

        if (transactionBackup.success) {
            const transactionImport = parseTransactionBackupPayload(
                payload,
                currentWorkspace.categories,
            );

            return {
                ...currentWorkspace,
                categories: transactionImport.categories,
                transactions: transactionImport.transactions,
            };
        }

        const budgetBackup = budgetBackupSchema.safeParse(payload);

        if (budgetBackup.success) {
            return {
                ...currentWorkspace,
                budgets: parseBudgetBackupPayload(
                    payload,
                    currentWorkspace.categories,
                ),
            };
        }

        throw new Error("Invalid workspace backup.");
    }

    const backupCategories = withCategoryIcons(parsed.data.categories);
    const sourceCategories = backupCategories.length
        ? backupCategories
        : currentWorkspace.categories;
    const categoryIdMap = new Map(
        sourceCategories.map((category) => [category.id, crypto.randomUUID()]),
    );
    const categories = sourceCategories.map((category) => ({
        ...category,
        id: categoryIdMap.get(category.id) ?? crypto.randomUUID(),
    }));
    const categoryIds = new Set(categories.map((category) => category.id));
    const accountIdMap = new Map(
        parsed.data.accounts.map((account) => [account.id, crypto.randomUUID()]),
    );
    const accounts = parsed.data.accounts.map((account) => ({
        ...account,
        id: accountIdMap.get(account.id) ?? crypto.randomUUID(),
    }));
    const transactions = parsed.data.transactions
        .map((transaction) => ({
            ...transaction,
            categoryId: categoryIdMap.get(transaction.categoryId) ?? "",
        }))
        .filter((transaction) => categoryIds.has(transaction.categoryId))
        .map((transaction) => ({
            ...transaction,
            id: crypto.randomUUID(),
            accountId:
                transaction.accountId && accountIdMap.has(transaction.accountId)
                    ? accountIdMap.get(transaction.accountId)
                    : undefined,
            note: transaction.note ?? "",
            time: normalizeTimeValue(transaction.time),
        }));
    const budgets = normalizeBackupBudgets(
        parsed.data.budgets,
        categories,
        backupCategories,
    ).filter(
        (budget) =>
            categoryIds.has(budget.categoryId) &&
            Number.isFinite(budget.limit) &&
            budget.limit > 0 &&
            budget.month,
    );
    const transfers = parsed.data.transfers.filter(
        (transfer) =>
            accountIdMap.has(transfer.fromAccountId) &&
            accountIdMap.has(transfer.toAccountId) &&
            transfer.fromAccountId !== transfer.toAccountId,
    ).map((transfer) => ({
        ...transfer,
        id: crypto.randomUUID(),
        fromAccountId:
            accountIdMap.get(transfer.fromAccountId) ?? transfer.fromAccountId,
        toAccountId: accountIdMap.get(transfer.toAccountId) ?? transfer.toAccountId,
    }));

    return {
        accounts,
        budgets,
        categories,
        transactions,
        transfers,
    };
}

export function createWorkspaceBackupPayload(
    workspace: WorkspaceBackup,
): WorkspaceBackupPayload {
    const categoryLookup = new Map(
        workspace.categories.map((category) => [category.id, category]),
    );
    return {
        type: "kwarta-workspace",
        exportedAt: new Date().toISOString(),
        accounts: workspace.accounts,
        budgets: workspace.budgets.map((budget) => {
            const category = categoryLookup.get(budget.categoryId);

            return {
                ...budget,
                categoryName: category?.name ?? "",
                categoryType: category?.type ?? "expense",
            };
        }),
        categories: workspace.categories,
        transactions: workspace.transactions,
        transfers: workspace.transfers,
    };
}

export function downloadWorkspaceBackupPayload(
    payload: WorkspaceBackupPayload,
    filenameDate = payload.exportedAt.slice(0, 10),
) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kwarta-backup-${filenameDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
}

export function downloadWorkspaceBackupFile(workspace: WorkspaceBackup) {
    downloadWorkspaceBackupPayload(createWorkspaceBackupPayload(workspace));
}
