import type { FormEvent } from "react";
import {
    categories as defaultCategories,
} from "@/lib/data";
import type {
    Account,
    AccountType,
    Budget,
    BudgetFrequency,
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

const REUSED_BUDGET_PERIOD_COUNT = 2;

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
    if (category.subcategories && category.subcategories.length > 0) {
        return category.subcategories;
    }

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

export type PeriodFrequency = "monthly" | "weekly" | "cycle";

export type BudgetCycleSettings = {
    firstStartDay: number;
    secondStartDay: number;
};

export const defaultBudgetCycleSettings: BudgetCycleSettings = {
    firstStartDay: 5,
    secondStartDay: 20,
};

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
    start.setDate(date.getDate() - date.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    return {
        startDate: toDateInputValue(start),
        endDate: toDateInputValue(end),
    };
}

export function normalizeBudgetCycleSettings(
    settings: BudgetCycleSettings,
): BudgetCycleSettings {
    const firstStartDay = clampCycleDay(settings.firstStartDay);
    const secondStartDay = clampCycleDay(settings.secondStartDay);

    if (firstStartDay === secondStartDay) {
        return firstStartDay < 28
            ? { firstStartDay, secondStartDay: firstStartDay + 1 }
            : { firstStartDay: 27, secondStartDay: 28 };
    }

    return firstStartDay < secondStartDay
        ? { firstStartDay, secondStartDay }
        : {
              firstStartDay: secondStartDay,
              secondStartDay: firstStartDay,
          };
}

function clampCycleDay(day: number) {
    if (!Number.isFinite(day)) {
        return 1;
    }

    return Math.min(Math.max(Math.round(day), 1), 28);
}

export function getBudgetCycleRange(
    dateValue: string,
    settings = defaultBudgetCycleSettings,
) {
    const cycleSettings = normalizeBudgetCycleSettings(settings);
    const date = parseDateValue(dateValue);
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    let start: Date;
    let end: Date;

    if (day < cycleSettings.firstStartDay) {
        start = new Date(year, month - 1, cycleSettings.secondStartDay);
        end = new Date(year, month, cycleSettings.firstStartDay - 1);
    } else if (day < cycleSettings.secondStartDay) {
        start = new Date(year, month, cycleSettings.firstStartDay);
        end = new Date(year, month, cycleSettings.secondStartDay - 1);
    } else {
        start = new Date(year, month, cycleSettings.secondStartDay);
        end = new Date(year, month + 1, cycleSettings.firstStartDay - 1);
    }

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

export function createBudgetCyclePeriod(
    dateValue: string,
    settings = defaultBudgetCycleSettings,
): SelectedPeriod {
    return {
        frequency: "cycle",
        ...getBudgetCycleRange(dateValue, settings),
    };
}

export function createWeeklyPeriod(dateValue: string): SelectedPeriod {
    return {
        frequency: "weekly",
        ...getWeekRange(dateValue),
    };
}

export function getPeriodMonth(period: SelectedPeriod) {
    return toMonthInputValue(parseDateValue(period.startDate));
}

export function getBudgetPeriodFields(
    period: SelectedPeriod,
    cycleSettings = defaultBudgetCycleSettings,
) {
    return {
        cycleFirstStartDay: cycleSettings.firstStartDay,
        cycleSecondStartDay: cycleSettings.secondStartDay,
        frequency: period.frequency as BudgetFrequency,
        month: getPeriodMonth(period),
        periodEnd: period.endDate,
        periodStart: period.startDate,
    };
}

export function getBudgetFrequency(budget: Budget): BudgetFrequency {
    return budget.frequency ?? "monthly";
}

export function getBudgetPeriodStart(budget: Budget) {
    return budget.periodStart ?? getMonthRange(budget.month).startDate;
}

export function getBudgetPeriodEnd(budget: Budget) {
    return budget.periodEnd ?? getMonthRange(budget.month).endDate;
}

export function budgetMatchesPeriod(budget: Budget, period: SelectedPeriod) {
    return (
        getBudgetFrequency(budget) === period.frequency &&
        getBudgetPeriodStart(budget) === period.startDate &&
        getBudgetPeriodEnd(budget) === period.endDate
    );
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

export function getPeriodNoun(period: SelectedPeriod) {
    if (period.frequency === "weekly") {
        return "weekly";
    }

    if (period.frequency === "cycle") {
        return "budget cycle";
    }

    return "monthly";
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

    return Array.from({ length: REUSED_BUDGET_PERIOD_COUNT }, (_, index) =>
        toMonthInputValue(
            new Date(start.getFullYear(), start.getMonth() + index, 1),
        ),
    );
}

function getReuseBudgetPeriods(values: BudgetFormValues) {
    if (values.frequency === "weekly") {
        const start = parseDateValue(values.periodStart);

        return Array.from({ length: REUSED_BUDGET_PERIOD_COUNT }, (_, index) => {
            const weekStart = new Date(start);
            weekStart.setDate(start.getDate() + index * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            return {
                frequency: "weekly" as const,
                month: toMonthInputValue(weekStart),
                periodEnd: toDateInputValue(weekEnd),
                periodStart: toDateInputValue(weekStart),
            };
        });
    }

    if (values.frequency === "cycle") {
        const cycleSettings = normalizeBudgetCycleSettings({
            firstStartDay: values.cycleFirstStartDay,
            secondStartDay: values.cycleSecondStartDay,
        });
        const start = parseDateValue(values.periodStart);

        return Array.from({ length: REUSED_BUDGET_PERIOD_COUNT }, (_, index) => {
            const nextStart = new Date(start);

            if (start.getDate() === cycleSettings.firstStartDay) {
                const cycleIndex = index;
                const monthOffset = Math.floor(cycleIndex / 2);
                const day =
                    cycleIndex % 2 === 0
                        ? cycleSettings.firstStartDay
                        : cycleSettings.secondStartDay;
                nextStart.setFullYear(
                    start.getFullYear(),
                    start.getMonth() + monthOffset,
                    day,
                );
            } else {
                const cycleIndex = index + 1;
                const monthOffset = Math.floor(cycleIndex / 2);
                const day =
                    cycleIndex % 2 === 1
                        ? cycleSettings.secondStartDay
                        : cycleSettings.firstStartDay;
                nextStart.setFullYear(
                    start.getFullYear(),
                    start.getMonth() + monthOffset,
                    day,
                );
            }

            const cycle = getBudgetCycleRange(
                toDateInputValue(nextStart),
                cycleSettings,
            );

            return {
                frequency: "cycle" as const,
                month: toMonthInputValue(parseDateValue(cycle.startDate)),
                periodEnd: cycle.endDate,
                periodStart: cycle.startDate,
            };
        });
    }

    return getReuseBudgetMonths(values.month).map((month) => {
        const range = getMonthRange(month);

        return {
            frequency: "monthly" as const,
            month,
            periodEnd: range.endDate,
            periodStart: range.startDate,
        };
    });
}

export function toBudgetRecord(values: BudgetFormValues): Omit<Budget, "id"> {
    return {
        categoryId: values.categoryId,
        frequency: values.frequency,
        limit: values.limit,
        month: values.month,
        periodEnd: values.periodEnd,
        periodStart: values.periodStart,
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

    const periods = getReuseBudgetPeriods(values);

    // Remove all existing budgets for this category+frequency so old
    // extra periods from a previous 13-period save don't accumulate.
    const remainingBudgets = budgets.filter(
        (budget) =>
            budget.categoryId !== values.categoryId ||
            getBudgetFrequency(budget) !== values.frequency,
    );

    const newBudgets = periods.map((period) => ({
        id: crypto.randomUUID(),
        categoryId: values.categoryId,
        frequency: period.frequency,
        limit: values.limit,
        month: period.month,
        periodEnd: period.periodEnd,
        periodStart: period.periodStart,
    }));

    return [...newBudgets, ...remainingBudgets];
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
