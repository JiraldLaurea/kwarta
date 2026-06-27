import type { FormEvent } from "react";
import {
    categories as defaultCategories,
} from "@/lib/data";
import type {
    Account,
    AccountType,
    Budget,
    Category,
    Transaction,
    Transfer,
    TransactionType,
} from "@/lib/types";
import type {
    BudgetFormValues,
    TransactionFormValues,
} from "@/lib/schema";

export const accountTypeLabels: Record<AccountType, string> = {
    bank: "Bank",
    cash: "Cash",
    ewallet: "E-Wallet",
};

export const accountTypeOrder: AccountType[] = ["bank", "ewallet", "cash"];

export function getAccountBalance(
    account: Account,
    transactions: Transaction[],
    transfers: Transfer[] = [],
) {
    const fromTransactions = transactions.reduce((balance, transaction) => {
        if (transaction.accountId !== account.id) {
            return balance;
        }

        return transaction.type === "income"
            ? balance + transaction.amount
            : balance - transaction.amount;
    }, account.openingBalance);

    return transfers.reduce((balance, transfer) => {
        // The source account loses the amount plus any transfer fee; the
        // destination account only receives the amount.
        if (transfer.fromAccountId === account.id) {
            return balance - transfer.amount - transfer.fee;
        }

        if (transfer.toAccountId === account.id) {
            return balance + transfer.amount;
        }

        return balance;
    }, fromTransactions);
}

export function getNetWorth(
    accounts: Account[],
    transactions: Transaction[],
    transfers: Transfer[] = [],
) {
    return accounts.reduce(
        (sum, account) =>
            sum + getAccountBalance(account, transactions, transfers),
        0,
    );
}

export function getDefaultAccountIcon(type: AccountType) {
    if (type === "bank") {
        return "landmark";
    }

    if (type === "ewallet") {
        return "smartphone";
    }

    return "banknote";
}

export function getFirstAccountId(accounts: Account[]) {
    return accounts[0]?.id ?? "";
}

export const defaultSubcategories: Record<string, string[]> = {
    salary: ["Paycheck", "Bonus", "Allowance", "Commission"],
    freelance: ["Project", "Client", "Retainer", "Commission"],
    housing: ["Rent", "Mortgage", "Maintenance", "Dues"],
    food: [
        "Breakfast",
        "Lunch",
        "Dinner",
        "Snack",
        "Groceries",
        "Coffee",
        "Beverage",
    ],
    transport: ["Commute", "Fuel", "Ride hailing", "Parking", "Fare"],
    utilities: ["Electricity", "Water", "Internet", "Phone", "Gas"],
    health: ["Medicine", "Doctor", "Dental", "Insurance", "Fitness"],
    shopping: ["Clothes", "Household", "Personal care", "Gifts"],
    subscriptions: ["Streaming", "Software", "Membership", "Cloud"],
};

const REUSED_BUDGET_MONTH_COUNT = 13;

export function normalizeTransactionType(value: string) {
    return value.trim().toLowerCase() as TransactionType;
}

export function slugifyCategoryValue(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export function getDefaultCategoryIcon(
    category: Pick<Category, "id" | "name" | "type">,
) {
    const categoryKey = slugifyCategoryValue(category.id || category.name);
    const nameKey = slugifyCategoryValue(category.name);
    const defaultCategory = defaultCategories.find(
        (seedCategory) =>
            slugifyCategoryValue(seedCategory.id) === categoryKey ||
            slugifyCategoryValue(seedCategory.name) === nameKey,
    );

    return (
        defaultCategory?.icon ??
        (category.type === "income" ? "banknote" : "receipt")
    );
}

export function withCategoryIcons(categories: Category[]) {
    return categories.map((category) => ({
        ...category,
        icon:
            category.icon || getDefaultCategoryIcon(category),
    }));
}

export function getSubcategoriesForCategory(category: Category) {
    const categoryKey = slugifyCategoryValue(category.id || category.name);
    const nameKey = slugifyCategoryValue(category.name);

    return (
        defaultSubcategories[categoryKey] ??
        defaultSubcategories[nameKey] ??
        (category.type === "income"
            ? ["Payment", "Bonus", "Transfer"]
            : ["General", "Personal", "Household"])
    );
}

export function getUniqueCategoryId(name: string, categories: Category[]) {
    const baseId = slugifyCategoryValue(name) || crypto.randomUUID();
    const existingIds = new Set(categories.map((category) => category.id));

    if (!existingIds.has(baseId)) {
        return baseId;
    }

    let index = 2;
    let nextId = `${baseId}-${index}`;

    while (existingIds.has(nextId)) {
        index += 1;
        nextId = `${baseId}-${index}`;
    }

    return nextId;
}

export function reorderCategoriesByType(
    categories: Category[],
    type: TransactionType,
    fromId: string,
    toId: string,
) {
    if (fromId === toId) {
        return categories;
    }

    const typedCategories = categories.filter(
        (category) => normalizeTransactionType(category.type) === type,
    );
    const fromIndex = typedCategories.findIndex(
        (category) => category.id === fromId,
    );
    const toIndex = typedCategories.findIndex(
        (category) => category.id === toId,
    );

    if (fromIndex < 0 || toIndex < 0) {
        return categories;
    }

    const nextTypedCategories = typedCategories.slice();
    const [movedCategory] = nextTypedCategories.splice(fromIndex, 1);
    nextTypedCategories.splice(toIndex, 0, movedCategory);

    const queues = {
        expense: nextTypedCategories.filter(
            (category) => normalizeTransactionType(category.type) === "expense",
        ),
        income: nextTypedCategories.filter(
            (category) => normalizeTransactionType(category.type) === "income",
        ),
    };

    return categories.map((category) => {
        const categoryType = normalizeTransactionType(category.type);

        if (categoryType !== type) {
            return category;
        }

        return queues[categoryType].shift() ?? category;
    });
}

export function withMissingDefaultCategories(
    categories: Category[],
    userId: string,
) {
    const categoriesWithIcons = withCategoryIcons(categories);
    const existingKeys = new Set(
        categoriesWithIcons.map(
            (category) =>
                `${normalizeTransactionType(category.type)}:${category.name.trim().toLowerCase()}`,
        ),
    );
    const missingDefaults = defaultCategories
        .filter(
            (category) =>
                !existingKeys.has(
                    `${normalizeTransactionType(category.type)}:${category.name.trim().toLowerCase()}`,
                ),
        )
        .map((category) => ({
            ...category,
            id: `${userId}-${category.id}`,
        }));

    return [...categoriesWithIcons, ...missingDefaults];
}

export function getFirstCategoryId(
    categories: Category[],
    type: TransactionType,
) {
    return (
        categories.find(
            (category) => normalizeTransactionType(category.type) === type,
        )?.id ?? ""
    );
}

export function getTransactionFormValues(
    values: Omit<TransactionFormValues, "time"> & { time?: string },
    categories: Category[],
): TransactionFormValues {
    const type = normalizeTransactionType(values.type);
    const availableCategories = categories.filter(
        (category) => normalizeTransactionType(category.type) === type,
    );
    const categoryIsValid = availableCategories.some(
        (category) => category.id === values.categoryId,
    );
    const categoryId = categoryIsValid
        ? values.categoryId
        : availableCategories[0]?.id ?? "";
    const category = availableCategories.find((item) => item.id === categoryId);
    const subcategories = category ? getSubcategoriesForCategory(category) : [];
    const subcategory = subcategories.includes(values.subcategory)
        ? values.subcategory
        : subcategories[0] ?? values.subcategory;

    return {
        ...values,
        categoryId,
        subcategory,
        note: values.note ?? "",
        time: normalizeTimeValue(values.time),
        type,
    };
}

export function normalizeTimeValue(value?: string) {
    return value && /^\d{2}:\d{2}$/.test(value) ? value : "00:00";
}

export function getCurrentTimeInputValue() {
    const date = new Date();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
}

export function sanitizeDecimalInput(value: string) {
    const numeric = value.replace(/[^\d.]/g, "");
    const [whole, ...decimalParts] = numeric.split(".");
    const decimal = decimalParts.join("");

    return decimalParts.length > 0 ? `${whole}.${decimal}` : whole;
}

export function handleDecimalInput(event: FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    input.value = sanitizeDecimalInput(input.value);
}

export function parseDecimalInput(value: unknown) {
    const sanitized = sanitizeDecimalInput(String(value ?? ""));
    return sanitized === "" ? 0 : Number(sanitized);
}

export function isInMonth(dateValue: string, monthValue: string) {
    return dateValue.startsWith(monthValue);
}

export type PeriodFrequency = "monthly" | "weekly" | "custom";

export type SelectedPeriod = {
    frequency: PeriodFrequency;
    startDate: string;
    endDate: string;
};

export function isInDateRange(
    dateValue: string,
    startDate: string,
    endDate: string,
) {
    return dateValue >= startDate && dateValue <= endDate;
}

export function getMonthRange(monthValue: string) {
    const date = parseMonthValue(monthValue);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    return {
        startDate: toDateInputValue(start),
        endDate: toDateInputValue(end),
    };
}

export function getWeekRange(dateValue: string) {
    const date = parseDateValue(dateValue);
    const start = new Date(date);
    const mondayOffset = (date.getDay() + 6) % 7;
    start.setDate(date.getDate() - mondayOffset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return {
        startDate: toDateInputValue(start),
        endDate: toDateInputValue(end),
    };
}

export function createMonthlyPeriod(monthValue: string): SelectedPeriod {
    return {
        frequency: "monthly",
        ...getMonthRange(monthValue),
    };
}

export function createWeeklyPeriod(dateValue: string): SelectedPeriod {
    return {
        frequency: "weekly",
        ...getWeekRange(dateValue),
    };
}

export function createCustomPeriod(
    startDate: string,
    endDate: string,
): SelectedPeriod {
    return {
        frequency: "custom",
        startDate,
        endDate: endDate < startDate ? startDate : endDate,
    };
}

export function getPeriodMonth(period: SelectedPeriod) {
    return toMonthInputValue(parseDateValue(period.startDate));
}

export function formatPeriodLabel(period: SelectedPeriod) {
    if (period.frequency === "monthly") {
        return formatMonthLabel(getPeriodMonth(period));
    }

    const start = parseDateValue(period.startDate);
    const end = parseDateValue(period.endDate);

    if (period.startDate === period.endDate) {
        return formatPickerDate(start);
    }

    const sameYear = start.getFullYear() === end.getFullYear();
    const dateOptions = {
        month: "short",
        day: "numeric",
        year: sameYear ? undefined : "numeric",
    } satisfies Intl.DateTimeFormatOptions;
    const startLabel = start.toLocaleDateString("en-US", {
        ...dateOptions,
    });
    const endLabel = end.toLocaleDateString("en-US", dateOptions);

    return `${startLabel} - ${endLabel}`;
}

export function getDefaultTransactionDate(monthValue: string) {
    const today = toDateInputValue(new Date());

    if (isInMonth(today, monthValue)) {
        return today;
    }

    return `${monthValue}-01`;
}

export function formatMonthLabel(monthValue: string) {
    return parseMonthValue(monthValue).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });
}

export function getDaysInMonth(monthValue: string) {
    const date = parseMonthValue(monthValue);

    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getAverageExpenseDayCount(monthValue: string) {
    const monthDate = parseMonthValue(monthValue);
    const today = new Date();
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
    const currentMonthStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
    );

    if (monthStart.getTime() === currentMonthStart.getTime()) {
        return today.getDate();
    }

    if (monthStart.getTime() < currentMonthStart.getTime()) {
        return getDaysInMonth(monthValue);
    }

    return 1;
}

export function getReuseBudgetMonths(monthValue: string) {
    const start = parseMonthValue(monthValue);

    return Array.from({ length: REUSED_BUDGET_MONTH_COUNT }, (_, index) =>
        toMonthInputValue(
            new Date(start.getFullYear(), start.getMonth() + index, 1),
        ),
    );
}

export function toBudgetRecord(values: BudgetFormValues): Omit<Budget, "id"> {
    return {
        categoryId: values.categoryId,
        limit: values.limit,
        month: values.month,
    };
}

export function upsertReusableBudgets(
    budgets: Budget[],
    values: BudgetFormValues,
    editingId?: string | null,
) {
    const baseBudget = toBudgetRecord(values);

    if (!values.reuseBudget) {
        return editingId
            ? budgets.map((budget) =>
                  budget.id === editingId
                      ? {
                            ...budget,
                            ...baseBudget,
                        }
                      : budget,
              )
            : [{ id: crypto.randomUUID(), ...baseBudget }, ...budgets];
    }

    const months = getReuseBudgetMonths(values.month);
    const remainingBudgets = editingId
        ? budgets.filter((budget) => budget.id !== editingId)
        : budgets.slice();
    const nextBudgets = remainingBudgets.slice();

    months.forEach((month) => {
        const existingIndex = nextBudgets.findIndex(
            (budget) =>
                budget.categoryId === values.categoryId &&
                budget.month === month,
        );
        const nextBudget = {
            categoryId: values.categoryId,
            limit: values.limit,
            month,
        };

        if (existingIndex >= 0) {
            nextBudgets[existingIndex] = {
                ...nextBudgets[existingIndex],
                ...nextBudget,
            };
            return;
        }

        nextBudgets.unshift({
            id: crypto.randomUUID(),
            ...nextBudget,
        });
    });

    return nextBudgets;
}

export function parseDateValue(value: string) {
    if (!value) {
        return new Date();
    }

    const [year, month, day] = value.split("-").map(Number);

    if (!year || !month || !day) {
        return new Date();
    }

    return new Date(year, month - 1, day);
}

export function parseMonthValue(value: string) {
    if (!value) {
        return new Date();
    }

    const [year, month] = value.split("-").map(Number);

    if (!year || !month) {
        return new Date();
    }

    return new Date(year, month - 1, 1);
}

export function toDateInputValue(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

export function toMonthInputValue(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
}

export function formatPickerDate(date: Date) {
    return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export function isSameDay(left: Date, right: Date) {
    return (
        left.getFullYear() === right.getFullYear() &&
        left.getMonth() === right.getMonth() &&
        left.getDate() === right.getDate()
    );
}

export function formatTransactionGroupDate(value: string) {
    const date = parseDateValue(value);

    return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        weekday: "long",
        year: "numeric",
    });
}

export function getTransactionGroupSummary(transactions: Transaction[]) {
    const income = transactions
        .filter((transaction) => transaction.type === "income")
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    const expense = transactions
        .filter((transaction) => transaction.type === "expense")
        .reduce((sum, transaction) => sum + transaction.amount, 0);

    return income > expense
        ? { amount: income, type: "income" as TransactionType }
        : { amount: expense, type: "expense" as TransactionType };
}

export function formatTime(value?: string) {
    const [hours = "0", minutes = "0"] = normalizeTimeValue(value).split(":");
    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);

    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });
}

export function getCalendarDays(month: Date) {
    const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(firstOfMonth);
    start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
    });
}
