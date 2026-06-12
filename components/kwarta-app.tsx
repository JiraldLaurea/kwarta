"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
    closestCenter,
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    type DragEndEvent,
    type DragStartEvent,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    rectSortingStrategy,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    Calendar,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    CircleDollarSign,
    BadgeDollarSign,
    Banknote,
    BriefcaseBusiness,
    Car,
    Clapperboard,
    GraduationCap,
    GripVertical,
    HeartPulse,
    Home,
    Laptop,
    Landmark,
    PiggyBank,
    Download,
    Edit3,
    Ellipsis,
    LogOut,
    Minus,
    Plus,
    Receipt,
    Repeat,
    ShoppingBag,
    Smartphone,
    Trash2,
    Utensils,
    Upload,
    Zap,
    type LucideIcon,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart as RePieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { z } from "zod";
import {
    budgets as seedBudgets,
    categories as seedCategories,
    transactions as seedTransactions,
} from "@/lib/data";
import {
    authSchema,
    budgetSchema,
    categorySchema,
    transactionSchema,
    type AuthFormValues,
    type BudgetFormValues,
    type CategoryFormValues,
    type TransactionFormValues,
} from "@/lib/schema";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
    AuthMode,
    Budget,
    Category,
    Transaction,
    TransactionType,
} from "@/lib/types";
import { cn, formatCurrency, formatDate, percent } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";

type View = "dashboard" | "transactions" | "budgets" | "reports";

const colorChoices = [
    "#171717",
    "#2563EB",
    "#7C3AED",
    "#16A34A",
    "#F59E0B",
    "#0891B2",
    "#DC2626",
    "#DB2777",
    "#4F46E5",
];

const categoryIconChoices = [
    { value: "home", label: "Home", icon: Home },
    { value: "utensils", label: "Food", icon: Utensils },
    { value: "car", label: "Transport", icon: Car },
    { value: "zap", label: "Utilities", icon: Zap },
    { value: "heart-pulse", label: "Health", icon: HeartPulse },
    { value: "shopping-bag", label: "Shopping", icon: ShoppingBag },
    { value: "repeat", label: "Subscriptions", icon: Repeat },
    { value: "briefcase", label: "Work", icon: BriefcaseBusiness },
    { value: "laptop", label: "Freelance", icon: Laptop },
    { value: "banknote", label: "Cash", icon: Banknote },
    { value: "landmark", label: "Bank", icon: Landmark },
    { value: "piggy-bank", label: "Savings", icon: PiggyBank },
    { value: "receipt", label: "Bills", icon: Receipt },
    { value: "smartphone", label: "Phone", icon: Smartphone },
    { value: "graduation-cap", label: "Education", icon: GraduationCap },
    { value: "clapperboard", label: "Entertainment", icon: Clapperboard },
    { value: "badge-dollar-sign", label: "Income", icon: BadgeDollarSign },
] satisfies Array<{ value: string; label: string; icon: LucideIcon }>;

const categoryIconMap = new Map(
    categoryIconChoices.map((choice) => [choice.value, choice.icon]),
);

const defaultSubcategories: Record<string, string[]> = {
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

function normalizeTransactionType(value: string) {
    return value.trim().toLowerCase() as TransactionType;
}

function slugifyCategoryValue(value: string) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function getDefaultCategoryIcon(
    category: Pick<Category, "id" | "name" | "type">,
) {
    const categoryKey = slugifyCategoryValue(category.id || category.name);
    const nameKey = slugifyCategoryValue(category.name);
    const defaultCategory = seedCategories.find(
        (seedCategory) =>
            slugifyCategoryValue(seedCategory.id) === categoryKey ||
            slugifyCategoryValue(seedCategory.name) === nameKey,
    );

    return (
        defaultCategory?.icon ??
        (category.type === "income" ? "banknote" : "receipt")
    );
}

function withCategoryIcons(categories: Category[]) {
    return categories.map((category) => ({
        ...category,
        icon: category.icon || getDefaultCategoryIcon(category),
    }));
}

function getSubcategoriesForCategory(category: Category) {
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

function getUniqueCategoryId(name: string, categories: Category[]) {
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

function reorderCategoriesByType(
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

function withMissingDefaultCategories(categories: Category[], userId: string) {
    const categoriesWithIcons = withCategoryIcons(categories);
    const existingKeys = new Set(
        categoriesWithIcons.map(
            (category) =>
                `${normalizeTransactionType(category.type)}:${category.name.trim().toLowerCase()}`,
        ),
    );
    const missingDefaults = seedCategories
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

function getFirstCategoryId(categories: Category[], type: TransactionType) {
    return (
        categories.find(
            (category) => normalizeTransactionType(category.type) === type,
        )?.id ?? ""
    );
}

function sanitizeDecimalInput(value: string) {
    const numeric = value.replace(/[^\d.]/g, "");
    const [whole, ...decimalParts] = numeric.split(".");

    if (decimalParts.length === 0) {
        return whole;
    }

    return `${whole}.${decimalParts.join("")}`;
}

function handleDecimalInput(event: React.FormEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    input.value = sanitizeDecimalInput(input.value);
}

function parseDecimalInput(value: unknown) {
    const sanitized = sanitizeDecimalInput(String(value ?? ""));
    return sanitized === "" ? 0 : Number(sanitized);
}

type StoredWorkspace = {
    budgets: Budget[];
    categories: Category[];
    transactions: Transaction[];
};

type TransactionImportResult = {
    categories: Category[];
    transactions: Transaction[];
};

const transactionBackupRecordSchema = transactionSchema.extend({
    id: z.string().min(1),
    note: z.string().optional(),
});

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
        (category) => category.id === categoryId,
    );

    if (backupCategory) {
        const matchingCurrentCategory = categories.find(
            (category) =>
                normalizeTransactionType(category.type) === categoryType &&
                category.name.trim().toLowerCase() ===
                    backupCategory.name.trim().toLowerCase(),
        );

        if (matchingCurrentCategory) {
            return matchingCurrentCategory.id;
        }
    }

    const normalizedCategoryId = slugifyCategoryValue(categoryId);
    const inferredCategory = availableCategories.find((category) => {
        const categoryNameSlug = slugifyCategoryValue(category.name);
        const categoryIdSlug = slugifyCategoryValue(category.id);

        return (
            normalizedCategoryId === categoryNameSlug ||
            normalizedCategoryId.endsWith(`-${categoryNameSlug}`) ||
            categoryIdSlug === normalizedCategoryId ||
            categoryIdSlug.endsWith(`-${normalizedCategoryId}`)
        );
    });

    if (inferredCategory) {
        return inferredCategory.id;
    }

    return getFirstCategoryId(categories, categoryType) || categoryId;
}

function mergeBackupCategories(
    categories: Category[],
    backupCategories: Category[],
) {
    const nextCategories = [...withCategoryIcons(categories)];

    withCategoryIcons(backupCategories).forEach((backupCategory) => {
        const matchingCategory = nextCategories.find(
            (category) =>
                normalizeTransactionType(category.type) ===
                    normalizeTransactionType(backupCategory.type) &&
                category.name.trim().toLowerCase() ===
                    backupCategory.name.trim().toLowerCase(),
        );

        if (matchingCategory) {
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

function parseTransactionBackupPayload(
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
        })),
    };
}

function parseBackupAmount(value: unknown) {
    if (typeof value === "number") {
        return value;
    }

    if (typeof value === "string") {
        const normalized = value.replace(/[^\d.-]/g, "");
        return normalized ? Number(normalized) : Number.NaN;
    }

    return Number.NaN;
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

function isInMonth(dateValue: string, monthValue: string) {
    return dateValue.slice(0, 7) === monthValue;
}

function getDefaultTransactionDate(monthValue: string) {
    const today = toDateInputValue(new Date());

    if (isInMonth(today, monthValue)) {
        return today;
    }

    return `${monthValue}-01`;
}

function formatMonthLabel(monthValue: string) {
    return parseMonthValue(monthValue).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });
}

function getDaysInMonth(monthValue: string) {
    const date = parseMonthValue(monthValue);

    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function parseBudgetBackupPayload(
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

function downloadBackupFile(
    label: "transactions" | "budgets",
    records: Transaction[] | Budget[],
    categories: Category[],
) {
    const exportedAt = new Date().toISOString();
    const exportedRecords =
        label === "budgets"
            ? (records as Budget[]).map((budget) => {
                  const category = categories.find(
                      (item) => item.id === budget.categoryId,
                  );

                  return {
                      ...budget,
                      categoryName: category?.name ?? "",
                      categoryType: category?.type ?? "expense",
                  };
              })
            : records;
    const backup = {
        type: `kwarta.${label}.v1`,
        exportedAt,
        categories,
        [label]: exportedRecords,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `kwarta-${label}-${exportedAt.slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

async function persistWorkspace(workspace: StoredWorkspace, userId: string) {
    const response = await fetch("/api/workspace", {
        body: JSON.stringify({ ...workspace, userId }),
        headers: {
            "Content-Type": "application/json",
        },
        method: "PUT",
    });

    if (!response.ok) {
        throw new Error("Unable to save workspace.");
    }
}

export function KwartaApp() {
    const [authReady, setAuthReady] = useState(false);
    const [workspaceReady, setWorkspaceReady] = useState(false);
    const [isAuthed, setIsAuthed] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);
    const [authMode, setAuthMode] = useState<AuthMode>("login");
    const [user, setUser] = useState<User | null>(null);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
    const [view, setView] = useState<View>("dashboard");
    const [selectedMonth, setSelectedMonth] = useState(() =>
        toMonthInputValue(new Date()),
    );
    const [categories, setCategories] = useState<Category[]>(seedCategories);
    const [transactions, setTransactions] =
        useState<Transaction[]>(seedTransactions);
    const [budgets, setBudgets] = useState<Budget[]>(seedBudgets);
    const [editingTransactionId, setEditingTransactionId] = useState<
        string | null
    >(null);
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
        null,
    );
    const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
    const [quickAddCategory, setQuickAddCategory] = useState<Category | null>(
        null,
    );
    const [homeCategoryFormOpen, setHomeCategoryFormOpen] = useState(false);
    const [homeEditMode, setHomeEditMode] = useState(false);
    const [categoryPendingDelete, setCategoryPendingDelete] =
        useState<Category | null>(null);
    const accountMenuRef = useRef<HTMLDivElement>(null);
    const supabase = useMemo(() => createSupabaseBrowserClient(), []);

    const userId = user?.id ?? null;

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlAuthError = params.get("auth_error");

        if (urlAuthError) {
            setAuthError(urlAuthError);
            window.history.replaceState({}, "", window.location.pathname);
        }

        if (!supabase) {
            setAuthReady(true);
            return;
        }

        supabase.auth.getSession().then(({ data }) => {
            setIsAuthed(Boolean(data.session));
            setUser(data.session?.user ?? null);
            setAuthReady(true);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setIsAuthed(Boolean(session));
            setUser(session?.user ?? null);
            setAuthReady(true);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase]);

    useEffect(() => {
        if (!isAuthed || !userId) {
            setWorkspaceReady(false);
            return;
        }

        let cancelled = false;
        const activeUserId = userId;

        async function loadWorkspace() {
            try {
                setWorkspaceReady(false);
                const response = await fetch(
                    `/api/workspace?userId=${encodeURIComponent(activeUserId)}`,
                );

                if (!response.ok) {
                    throw new Error("Unable to load workspace.");
                }

                const workspace = (await response.json()) as StoredWorkspace;

                if (cancelled) {
                    return;
                }

                setCategories(
                    withMissingDefaultCategories(
                        workspace.categories,
                        activeUserId,
                    ),
                );
                setTransactions(workspace.transactions);
                setBudgets(workspace.budgets);
            } catch {
                if (cancelled) {
                    return;
                }

                setCategories(seedCategories);
                setTransactions([]);
                setBudgets([]);
            } finally {
                if (!cancelled) {
                    setWorkspaceReady(true);
                }
            }
        }

        loadWorkspace();

        return () => {
            cancelled = true;
        };
    }, [isAuthed, userId]);

    useEffect(() => {
        if (!workspaceReady || !userId) {
            return;
        }

        const timeout = window.setTimeout(() => {
            persistWorkspace(
                {
                    budgets,
                    categories,
                    transactions,
                },
                userId,
            ).catch(() => {
                // The UI remains usable; the next successful change will retry persistence.
            });
        }, 350);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [budgets, categories, transactions, userId, workspaceReady]);

    useEffect(() => {
        if (!accountMenuOpen) {
            return;
        }

        function handlePointerDown(event: PointerEvent) {
            if (
                accountMenuRef.current &&
                !accountMenuRef.current.contains(event.target as Node)
            ) {
                setAccountMenuOpen(false);
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [accountMenuOpen]);

    const monthTransactions = useMemo(
        () =>
            transactions.filter((transaction) =>
                isInMonth(transaction.date, selectedMonth),
            ),
        [selectedMonth, transactions],
    );
    const monthBudgets = useMemo(
        () => budgets.filter((budget) => budget.month === selectedMonth),
        [budgets, selectedMonth],
    );

    const totals = useMemo(() => {
        const income = monthTransactions
            .filter((transaction) => transaction.type === "income")
            .reduce((sum, transaction) => sum + transaction.amount, 0);
        const expenses = monthTransactions
            .filter((transaction) => transaction.type === "expense")
            .reduce((sum, transaction) => sum + transaction.amount, 0);

        return {
            income,
            expenses,
            balance: income - expenses,
        };
    }, [monthTransactions]);

    const expenseCategories = categories.filter(
        (category) => normalizeTransactionType(category.type) === "expense",
    );
    const incomeCategories = categories.filter(
        (category) => normalizeTransactionType(category.type) === "income",
    );
    const accountName = getAccountName(user);

    const spendingByCategory = useMemo(() => {
        return expenseCategories
            .map((category) => ({
                name: category.name,
                value: monthTransactions
                    .filter(
                        (transaction) =>
                            transaction.type === "expense" &&
                            transaction.categoryId === category.id,
                    )
                    .reduce((sum, transaction) => sum + transaction.amount, 0),
                color: category.color,
            }))
            .filter((item) => item.value > 0);
    }, [expenseCategories, monthTransactions]);

    const cashflowData = useMemo(() => {
        return monthTransactions
            .slice()
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((transaction) => ({
                date: new Date(transaction.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                }),
                income: transaction.type === "income" ? transaction.amount : 0,
                expense:
                    transaction.type === "expense" ? transaction.amount : 0,
            }));
    }, [monthTransactions]);

    if (!authReady || (isAuthed && !workspaceReady)) {
        return <AuthLoadingScreen />;
    }

    if (!isAuthed) {
        return (
            <AuthScreen
                mode={authMode}
                onModeChange={setAuthMode}
                error={authError}
                onEmailSubmit={async (values) => {
                    setAuthError(null);

                    if (!supabase) {
                        setAuthError(
                            "Add Supabase env vars to enable account login.",
                        );
                        return;
                    }

                    const result =
                        authMode === "login"
                            ? await supabase.auth.signInWithPassword(values)
                            : await supabase.auth.signUp(values);

                    if (result.error) {
                        setAuthError(result.error.message);
                        return;
                    }

                    setUser(result.data.user ?? null);
                    setIsAuthed(
                        Boolean(result.data.session || result.data.user),
                    );
                }}
                onGoogleLogin={async () => {
                    setAuthError(null);

                    if (!supabase) {
                        setAuthError(
                            "Add Supabase env vars to enable Google login.",
                        );
                        return;
                    }

                    const { error } = await supabase.auth.signInWithOAuth({
                        provider: "google",
                        options: {
                            redirectTo: `${window.location.origin}/auth/callback`,
                        },
                    });

                    if (error) {
                        setAuthError(error.message);
                    }
                }}
            />
        );
    }

    return (
        <main className="min-h-screen bg-neutral-50">
            <header className="sticky top-0 z-30 border-b bg-white">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-5 md:py-4">
                    <button
                        className="flex items-center gap-2 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        type="button"
                        onClick={() => {
                            setView("dashboard");
                            setMobileMoreOpen(false);
                        }}
                    >
                        <LogoMark size={36} />
                        <span className="text-lg font-semibold leading-6">
                            Kwarta
                        </span>
                    </button>

                    <nav className="hidden items-center gap-2 md:flex">
                        <NavItems activeView={view} onSelect={setView} />
                        <div className="relative" ref={accountMenuRef}>
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                    setAccountMenuOpen((open) => !open)
                                }
                            >
                                <ProfileImage user={user} size="xs" />
                                <span className="max-w-28 truncate">
                                    {accountName}
                                </span>
                                <ChevronDown
                                    className="h-3.5 w-3.5"
                                    aria-hidden
                                />
                            </Button>
                            {accountMenuOpen && (
                                <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-white shadow-sm">
                                    <div className="p-4">
                                        <p className="max-w-full truncate text-base font-medium leading-6">
                                            {accountName}
                                        </p>
                                        <p className="max-w-full truncate text-sm leading-5 text-muted-foreground">
                                            {user?.email ?? "Account session"}
                                        </p>
                                    </div>
                                    <div className="h-px bg-border" />
                                    <div className="px-2 py-2">
                                        <Button
                                            className="h-10 w-full cursor-pointer justify-between rounded-md px-3 text-sm font-normal md:hover:bg-neutral-100"
                                            type="button"
                                            variant="ghost"
                                            onClick={async () => {
                                                await supabase?.auth.signOut();
                                                setAccountMenuOpen(false);
                                                setUser(null);
                                                setIsAuthed(false);
                                            }}
                                        >
                                            <span>Log Out</span>
                                            <LogOut
                                                className="h-4 w-4"
                                                aria-hidden
                                            />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </nav>
                </div>
            </header>

            <div className="mx-auto w-full max-w-7xl px-4 pb-28 pt-5 md:px-5 md:py-7">
                {view === "dashboard" && (
                    <HomeView
                        budgets={monthBudgets}
                        editMode={homeEditMode}
                        expenseCategories={expenseCategories}
                        incomeCategories={incomeCategories}
                        month={selectedMonth}
                        onAddCategory={() => setHomeCategoryFormOpen(true)}
                        onDeleteCategory={setCategoryPendingDelete}
                        onEditCategory={(category) =>
                            setEditingCategoryId(category.id)
                        }
                        onEditModeChange={setHomeEditMode}
                        onMonthChange={setSelectedMonth}
                        onReorderCategory={(type, fromId, toId) =>
                            setCategories((current) =>
                                reorderCategoriesByType(
                                    current,
                                    type,
                                    fromId,
                                    toId,
                                ),
                            )
                        }
                        onSelectCategory={setQuickAddCategory}
                        transactions={monthTransactions}
                    />
                )}

                {view === "transactions" && (
                    <TransactionsView
                        categories={categories}
                        editingId={editingTransactionId}
                        month={selectedMonth}
                        onCancelEdit={() => setEditingTransactionId(null)}
                        onDelete={(id) =>
                            setTransactions((current) =>
                                current.filter(
                                    (transaction) => transaction.id !== id,
                                ),
                            )
                        }
                        onEdit={(transaction) =>
                            setEditingTransactionId(transaction.id)
                        }
                        onImport={async (
                            nextTransactions,
                            nextCategories = categories,
                        ) => {
                            if (userId) {
                                await persistWorkspace(
                                    {
                                        budgets,
                                        categories: nextCategories,
                                        transactions: nextTransactions,
                                    },
                                    userId,
                                );
                            }

                            setCategories(nextCategories);
                            setTransactions(nextTransactions);
                            setEditingTransactionId(null);
                        }}
                        onSubmit={(values) => {
                            if (editingTransactionId) {
                                setTransactions((current) =>
                                    current.map((transaction) =>
                                        transaction.id === editingTransactionId
                                            ? {
                                                  ...transaction,
                                                  ...values,
                                                  note: values.note || "",
                                              }
                                            : transaction,
                                    ),
                                );
                                setEditingTransactionId(null);
                                return;
                            }

                            setTransactions((current) => [
                                {
                                    id: crypto.randomUUID(),
                                    ...values,
                                    note: values.note || "",
                                },
                                ...current,
                            ]);
                        }}
                        allTransactions={transactions}
                        transactions={monthTransactions}
                    />
                )}

                {view === "budgets" && (
                    <BudgetsView
                        allBudgets={budgets}
                        budgets={monthBudgets}
                        categories={expenseCategories}
                        editingId={editingBudgetId}
                        month={selectedMonth}
                        onCancelEdit={() => setEditingBudgetId(null)}
                        onDelete={(id) =>
                            setBudgets((current) =>
                                current.filter((budget) => budget.id !== id),
                            )
                        }
                        onEdit={(budget) => setEditingBudgetId(budget.id)}
                        onImport={async (nextBudgets) => {
                            if (userId) {
                                await persistWorkspace(
                                    {
                                        budgets: nextBudgets,
                                        categories,
                                        transactions,
                                    },
                                    userId,
                                );
                            }

                            setBudgets(nextBudgets);
                            setEditingBudgetId(null);
                        }}
                        onSubmit={(values) => {
                            if (editingBudgetId) {
                                setBudgets((current) =>
                                    current.map((budget) =>
                                        budget.id === editingBudgetId
                                            ? { ...budget, ...values }
                                            : budget,
                                    ),
                                );
                                setEditingBudgetId(null);
                                return;
                            }

                            setBudgets((current) => [
                                { id: crypto.randomUUID(), ...values },
                                ...current,
                            ]);
                        }}
                        transactions={monthTransactions}
                    />
                )}

                {view === "reports" && (
                    <div className="space-y-4">
                        <section>
                            <div className="mb-4 max-w-[220px]">
                                <MonthPickerInput
                                    ariaLabel="Select reports month"
                                    compact
                                    value={selectedMonth}
                                    onChange={setSelectedMonth}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <MetricCard
                                    label="Income"
                                    value={formatCurrency(totals.income)}
                                    icon="plus"
                                />
                                <MetricCard
                                    label="Expenses"
                                    value={formatCurrency(totals.expenses)}
                                    icon="minus"
                                />
                                <MetricCard
                                    className="col-span-2 sm:col-span-1"
                                    label="Balance"
                                    value={formatCurrency(totals.balance)}
                                    icon="wallet"
                                />
                            </div>
                        </section>

                        <DashboardView
                            budgets={monthBudgets}
                            categories={categories}
                            cashflowData={cashflowData}
                            spendingByCategory={spendingByCategory}
                            transactions={monthTransactions}
                        />
                    </div>
                )}
            </div>
            {quickAddCategory && (
                <QuickTransactionModal
                    budget={monthBudgets.find(
                        (budget) => budget.categoryId === quickAddCategory.id,
                    )}
                    category={quickAddCategory}
                    month={selectedMonth}
                    onClose={() => setQuickAddCategory(null)}
                    onSetBudget={(limit) => {
                        setBudgets((current) => {
                            const existingBudget = current.find(
                                (budget) =>
                                    budget.categoryId === quickAddCategory.id &&
                                    budget.month === selectedMonth,
                            );

                            if (existingBudget) {
                                return current.map((budget) =>
                                    budget.id === existingBudget.id
                                        ? { ...budget, limit }
                                        : budget,
                                );
                            }

                            return [
                                {
                                    id: crypto.randomUUID(),
                                    categoryId: quickAddCategory.id,
                                    limit,
                                    month: selectedMonth,
                                },
                                ...current,
                            ];
                        });
                        setQuickAddCategory(null);
                    }}
                    onSubmit={({ amount, date, subcategory }) => {
                        setTransactions((current) => [
                            {
                                id: crypto.randomUUID(),
                                amount,
                                categoryId: quickAddCategory.id,
                                date,
                                merchant: subcategory,
                                note: "",
                                type: quickAddCategory.type,
                            },
                            ...current,
                        ]);
                        setQuickAddCategory(null);
                    }}
                />
            )}
            {homeCategoryFormOpen && (
                <EditModal onClose={() => setHomeCategoryFormOpen(false)}>
                    <CategoryForm
                        modal
                        onCancel={() => setHomeCategoryFormOpen(false)}
                        onSubmit={(values) => {
                            setCategories((current) => [
                                {
                                    id: getUniqueCategoryId(
                                        values.name,
                                        current,
                                    ),
                                    ...values,
                                },
                                ...current,
                            ]);
                            setHomeCategoryFormOpen(false);
                        }}
                    />
                </EditModal>
            )}
            {view === "dashboard" &&
                editingCategoryId &&
                categories.find(
                    (category) => category.id === editingCategoryId,
                ) && (
                    <EditModal onClose={() => setEditingCategoryId(null)}>
                        <CategoryForm
                            editing={
                                categories.find(
                                    (category) =>
                                        category.id === editingCategoryId,
                                )!
                            }
                            onCancel={() => setEditingCategoryId(null)}
                            onSubmit={(values) => {
                                setCategories((current) =>
                                    current.map((category) =>
                                        category.id === editingCategoryId
                                            ? { ...category, ...values }
                                            : category,
                                    ),
                                );
                                setEditingCategoryId(null);
                            }}
                        />
                    </EditModal>
                )}
            {categoryPendingDelete && (
                <DeleteCategoryConfirmationModal
                    category={categoryPendingDelete}
                    onCancel={() => setCategoryPendingDelete(null)}
                    onConfirm={() => {
                        const categoryId = categoryPendingDelete.id;

                        setCategories((current) =>
                            current.filter(
                                (category) => category.id !== categoryId,
                            ),
                        );
                        setTransactions((current) =>
                            current.filter(
                                (transaction) =>
                                    transaction.categoryId !== categoryId,
                            ),
                        );
                        setBudgets((current) =>
                            current.filter(
                                (budget) => budget.categoryId !== categoryId,
                            ),
                        );
                        setCategoryPendingDelete(null);
                    }}
                />
            )}
            {mobileMoreOpen && (
                <MobileMoreSheet
                    accountName={accountName}
                    email={user?.email ?? "Account session"}
                    onClose={() => setMobileMoreOpen(false)}
                    onSignOut={async () => {
                        await supabase?.auth.signOut();
                        setMobileMoreOpen(false);
                        setUser(null);
                        setIsAuthed(false);
                    }}
                />
            )}
            <MobileTabBar
                activeView={view}
                moreOpen={mobileMoreOpen}
                onMore={() => setMobileMoreOpen((open) => !open)}
                onSelect={(nextView) => {
                    setView(nextView);
                    setMobileMoreOpen(false);
                }}
            />
        </main>
    );
}

function AuthLoadingScreen() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-5">
            <div className="w-full max-w-sm rounded-md border border-border bg-white p-6 text-center">
                <div className="mx-auto mb-1 w-fit">
                    <LogoMark size={40} />
                </div>
                <h1 className="text-xl font-medium leading-7">Kwarta</h1>
                <p className="mt-2 inline-flex items-center justify-center gap-2 text-sm leading-5 text-muted-foreground">
                    <span
                        className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-neutral-200 border-t-foreground"
                        aria-hidden
                    />
                    Loading your account...
                </p>
            </div>
        </main>
    );
}

function NavItems({
    activeView,
    mobile = false,
    onSelect,
}: {
    activeView: View;
    mobile?: boolean;
    onSelect: (view: View) => void;
}) {
    const items: Array<{ label: string; view: View }> = [
        { label: "Home", view: "dashboard" },
        { label: "Transactions", view: "transactions" },
        { label: "Budgets", view: "budgets" },
        { label: "Reports", view: "reports" },
    ];

    return (
        <>
            {items.map((item) => (
                <Button
                    className={cn(
                        "min-w-28 justify-center",
                        mobile && "w-full justify-start",
                    )}
                    key={item.view}
                    type="button"
                    variant={activeView === item.view ? "default" : "secondary"}
                    size="sm"
                    onClick={() => onSelect(item.view)}
                >
                    {item.label}
                </Button>
            ))}
        </>
    );
}

function MobileTabBar({
    activeView,
    moreOpen,
    onMore,
    onSelect,
}: {
    activeView: View;
    moreOpen: boolean;
    onMore: () => void;
    onSelect: (view: View) => void;
}) {
    const items: Array<{
        icon: MobileTabIconName;
        label: string;
        view: View;
    }> = [
        { icon: "dashboard", label: "Home", view: "dashboard" },
        { icon: "transactions", label: "Transactions", view: "transactions" },
        { icon: "budgets", label: "Budgets", view: "budgets" },
        { icon: "reports", label: "Reports", view: "reports" },
    ];

    return (
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] backdrop-blur-md md:hidden">
            <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
                {items.map((item) => {
                    const active = activeView === item.view && !moreOpen;

                    return (
                        <button
                            className={cn(
                                "flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] font-medium leading-3 text-[#9CA3AF] transition-colors",
                                active && "text-primary",
                            )}
                            key={item.view}
                            type="button"
                            onClick={() => onSelect(item.view)}
                        >
                            <MobileTabIcon active={active} name={item.icon} />
                            <span className="max-w-full truncate">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
                <button
                    className={cn(
                        "flex h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] font-medium leading-3 text-[#9CA3AF] transition-colors",
                        moreOpen && "text-primary",
                    )}
                    type="button"
                    onClick={onMore}
                >
                    <MobileTabIcon active={moreOpen} name="more" />
                    <span>More</span>
                </button>
            </div>
        </nav>
    );
}

type MobileTabIconName =
    | "dashboard"
    | "transactions"
    | "budgets"
    | "reports"
    | "more";

function MobileTabIcon({
    active,
    name,
}: {
    active: boolean;
    name: MobileTabIconName;
}) {
    const commonProps = {
        "aria-hidden": true,
        className: "h-6 w-6",
        fill: "none",
        viewBox: "0 0 24 24",
        xmlns: "http://www.w3.org/2000/svg",
    };
    const strokeProps = {
        stroke: "currentColor",
        strokeLinecap: "round" as const,
        strokeLinejoin: "round" as const,
        strokeWidth: 1.9,
    };

    if (name === "dashboard") {
        return (
            <svg {...commonProps}>
                {active ? (
                    <>
                        <rect
                            height="7"
                            rx="1.5"
                            fill="currentColor"
                            width="7"
                            x="4"
                            y="4"
                        />
                        <rect
                            height="7"
                            rx="1.5"
                            fill="currentColor"
                            width="7"
                            x="13"
                            y="4"
                        />
                        <rect
                            height="7"
                            rx="1.5"
                            fill="currentColor"
                            width="7"
                            x="4"
                            y="13"
                        />
                        <rect
                            height="7"
                            rx="1.5"
                            fill="currentColor"
                            width="7"
                            x="13"
                            y="13"
                        />
                    </>
                ) : (
                    <>
                        <rect
                            height="7"
                            rx="1.5"
                            {...strokeProps}
                            width="7"
                            x="4"
                            y="4"
                        />
                        <rect
                            height="7"
                            rx="1.5"
                            {...strokeProps}
                            width="7"
                            x="13"
                            y="4"
                        />
                        <rect
                            height="7"
                            rx="1.5"
                            {...strokeProps}
                            width="7"
                            x="4"
                            y="13"
                        />
                        <rect
                            height="7"
                            rx="1.5"
                            {...strokeProps}
                            width="7"
                            x="13"
                            y="13"
                        />
                    </>
                )}
            </svg>
        );
    }

    if (name === "transactions") {
        return (
            <svg {...commonProps}>
                {active ? (
                    <>
                        <path
                            d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V20l-3-1.75L12 20l-3-1.75L6 20V4.75Z"
                            fill="currentColor"
                        />
                        <path
                            d="M9 8h6M9 12h6M9 16h3.5"
                            stroke="#FFFFFF"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.6"
                        />
                    </>
                ) : (
                    <>
                        <path
                            d="M6 4.75A1.75 1.75 0 0 1 7.75 3h8.5A1.75 1.75 0 0 1 18 4.75V20l-3-1.75L12 20l-3-1.75L6 20V4.75Z"
                            {...strokeProps}
                        />
                        <path d="M9 8h6M9 12h6M9 16h3.5" {...strokeProps} />
                    </>
                )}
            </svg>
        );
    }

    if (name === "budgets") {
        return (
            <svg {...commonProps}>
                {active ? (
                    <>
                        <path
                            d="M4 7.25A2.25 2.25 0 0 1 6.25 5h10.5A2.25 2.25 0 0 1 19 7.25V8H6.25A2.25 2.25 0 0 1 4 5.75v0"
                            fill="currentColor"
                        />
                        <path
                            d="M4 8h15.25A1.75 1.75 0 0 1 21 9.75v7.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25v-10"
                            fill="currentColor"
                        />
                        <circle cx="17.5" cy="14.5" fill="#FFFFFF" r="1.5" />
                    </>
                ) : (
                    <>
                        <path
                            d="M4 7.25A2.25 2.25 0 0 1 6.25 5h10.5A2.25 2.25 0 0 1 19 7.25V8H6.25A2.25 2.25 0 0 1 4 5.75v0"
                            {...strokeProps}
                        />
                        <path
                            d="M4 8h15.25A1.75 1.75 0 0 1 21 9.75v7.5A2.75 2.75 0 0 1 18.25 20H5.75A2.75 2.75 0 0 1 3 17.25v-10"
                            {...strokeProps}
                        />
                        <circle cx="17.5" cy="14.5" r="1.5" {...strokeProps} />
                    </>
                )}
            </svg>
        );
    }

    if (name === "reports") {
        return (
            <svg {...commonProps}>
                {active ? (
                    <>
                        <rect
                            height="14"
                            rx="2"
                            fill="currentColor"
                            width="16"
                            x="4"
                            y="5"
                        />
                        <path
                            d="M8 15v-3M12 15V9M16 15v-5"
                            stroke="#FFFFFF"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.7"
                        />
                    </>
                ) : (
                    <>
                        <rect
                            height="14"
                            rx="2"
                            width="16"
                            x="4"
                            y="5"
                            {...strokeProps}
                        />
                        <path d="M8 15v-3M12 15V9M16 15v-5" {...strokeProps} />
                    </>
                )}
            </svg>
        );
    }

    return (
        <svg {...commonProps}>
            {active ? (
                <>
                    <circle cx="7" cy="12" fill="currentColor" r="1.75" />
                    <circle cx="12" cy="12" fill="currentColor" r="1.75" />
                    <circle cx="17" cy="12" fill="currentColor" r="1.75" />
                </>
            ) : (
                <>
                    <circle cx="7" cy="12" r="1.75" {...strokeProps} />
                    <circle cx="12" cy="12" r="1.75" {...strokeProps} />
                    <circle cx="17" cy="12" r="1.75" {...strokeProps} />
                </>
            )}
        </svg>
    );
}

function MobileMoreSheet({
    accountName,
    email,
    onClose,
    onSignOut,
}: {
    accountName: string;
    email: string;
    onClose: () => void;
    onSignOut: () => void;
}) {
    return (
        <>
            <button
                aria-label="Close more menu"
                className="fixed inset-x-0 bottom-0 top-0 z-40 cursor-default bg-white/45 backdrop-blur-sm md:hidden"
                type="button"
                onClick={onClose}
            />
            <section className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-lg overflow-hidden rounded-xl border border-border bg-white shadow-[0_18px_60px_rgba(0,0,0,0.14)] md:hidden">
                <div className="px-4 py-4">
                    <p className="truncate font-medium leading-5">
                        {accountName}
                    </p>
                    <p className="truncate text-sm leading-4 text-muted-foreground">
                        {email}
                    </p>
                </div>
                <div className="h-px bg-border" />
                <div className="px-2 py-2">
                    <Button
                        className="h-10 w-full cursor-pointer justify-between rounded-md px-3 text-sm font-normal md:hover:bg-neutral-100"
                        type="button"
                        variant="ghost"
                        onClick={onSignOut}
                    >
                        <span>Log Out</span>
                        <LogOut className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                </div>
            </section>
        </>
    );
}

function LogoMark({ size }: { size: number }) {
    return (
        <Image
            alt=""
            aria-hidden
            className="shrink-0 bg-black p-[2px] rounded-md"
            height={size}
            src="/kwarta-logo.png"
            width={size}
            priority
        />
    );
}

function AuthScreen({
    error,
    mode,
    onEmailSubmit,
    onModeChange,
    onGoogleLogin,
}: {
    error: string | null;
    mode: AuthMode;
    onEmailSubmit: (values: AuthFormValues) => void | Promise<void>;
    onModeChange: (mode: AuthMode) => void;
    onGoogleLogin: () => void;
}) {
    const form = useForm<AuthFormValues>({
        resolver: zodResolver(authSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    return (
        <main className="min-h-screen bg-neutral-50">
            <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-3 px-5 py-8 sm:gap-10 sm:py-10 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <section>
                    <div className="mb-0 flex items-center gap-2 sm:mb-8">
                        <LogoMark size={40} />
                        <span className="text-xl font-semibold leading-6">
                            Kwarta
                        </span>
                    </div>
                    <h1 className="hidden max-w-2xl text-4xl font-semibold leading-tight tracking-normal text-foreground sm:block md:text-5xl">
                        A precise budget tracker for clearer everyday money
                        decisions.
                    </h1>
                    <p className="mt-5 hidden max-w-xl text-base leading-7 text-muted-foreground sm:block">
                        Manage income, expenses, categories, and monthly limits
                        in a focused product workspace designed for repeat use.
                    </p>
                </section>

                <Card className="bg-white">
                    <CardHeader>
                        <CardTitle className="text-3xl font-semibold leading-9">
                            {mode === "login" ? "Sign in" : "Create account"}
                        </CardTitle>
                        <p className="text-base leading-6 text-muted-foreground">
                            {mode === "login"
                                ? "Welcome back! Let's sign in to your account."
                                : "Create an account to start tracking your money."}
                        </p>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="mt-4 w-full"
                            type="button"
                            variant="secondary"
                            onClick={onGoogleLogin}
                        >
                            <GoogleLogo className="h-5 w-5" />
                            {mode === "login"
                                ? "Sign in with Google"
                                : "Sign up with Google"}
                        </Button>
                        <div className="my-4 flex items-center gap-3">
                            <div className="flex-1 border-t border-border" />
                            <span className="text-sm leading-5 text-muted-foreground">
                                or
                            </span>
                            <div className="flex-1 border-t border-border" />
                        </div>
                        {error && (
                            <p className="mb-4 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-destructive">
                                {error}
                            </p>
                        )}
                        <form
                            className="space-y-4"
                            onSubmit={form.handleSubmit(onEmailSubmit)}
                        >
                            <FieldError
                                message={form.formState.errors.email?.message}
                            >
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    {...form.register("email")}
                                />
                            </FieldError>
                            <FieldError
                                message={
                                    form.formState.errors.password?.message
                                }
                            >
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    {...form.register("password")}
                                />
                            </FieldError>
                            <Button className="w-full" type="submit">
                                {mode === "login"
                                    ? "Sign in"
                                    : "Create account"}
                            </Button>
                        </form>
                        <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
                            <span className="text-muted-foreground">
                                {mode === "login"
                                    ? "Don't have an account?"
                                    : "Already registered?"}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    onModeChange(
                                        mode === "login" ? "register" : "login",
                                    )
                                }
                            >
                                {mode === "login" ? "Sign up" : "Sign in"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}

function HomeView({
    budgets,
    editMode,
    expenseCategories,
    incomeCategories,
    month,
    onAddCategory,
    onDeleteCategory,
    onEditCategory,
    onEditModeChange,
    onMonthChange,
    onReorderCategory,
    onSelectCategory,
    transactions,
}: {
    budgets: Budget[];
    editMode: boolean;
    expenseCategories: Category[];
    incomeCategories: Category[];
    month: string;
    onAddCategory: () => void;
    onDeleteCategory: (category: Category) => void;
    onEditCategory: (category: Category) => void;
    onEditModeChange: (editMode: boolean) => void;
    onMonthChange: (month: string) => void;
    onReorderCategory: (
        type: TransactionType,
        fromId: string,
        toId: string,
    ) => void;
    onSelectCategory: (category: Category) => void;
    transactions: Transaction[];
}) {
    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <MonthPickerInput
                    ariaLabel="Select home month"
                    compact
                    value={month}
                    onChange={onMonthChange}
                />
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onAddCategory}
                    >
                        <Plus className="h-4 w-4" aria-hidden />
                        Add
                    </Button>
                    <Button
                        type="button"
                        variant={editMode ? "default" : "secondary"}
                        onClick={() => onEditModeChange(!editMode)}
                    >
                        {editMode ? (
                            <Check className="h-4 w-4" aria-hidden />
                        ) : (
                            <Edit3 className="h-4 w-4" aria-hidden />
                        )}
                        {editMode ? "Done" : "Edit"}
                    </Button>
                </div>
            </div>
            <CategoryQuickAddSection
                budgets={budgets}
                editMode={editMode}
                title="Expenses"
                categories={expenseCategories}
                onDeleteCategory={onDeleteCategory}
                onEditCategory={onEditCategory}
                onReorderCategory={onReorderCategory}
                transactions={transactions}
                onSelectCategory={onSelectCategory}
            />
            <CategoryQuickAddSection
                budgets={budgets}
                editMode={editMode}
                title="Income"
                categories={incomeCategories}
                onDeleteCategory={onDeleteCategory}
                onEditCategory={onEditCategory}
                onReorderCategory={onReorderCategory}
                transactions={transactions}
                onSelectCategory={onSelectCategory}
            />
        </div>
    );
}

function CategoryQuickAddSection({
    budgets,
    categories,
    editMode,
    onDeleteCategory,
    onEditCategory,
    onReorderCategory,
    onSelectCategory,
    title,
    transactions,
}: {
    budgets: Budget[];
    categories: Category[];
    editMode: boolean;
    onDeleteCategory: (category: Category) => void;
    onEditCategory: (category: Category) => void;
    onReorderCategory: (
        type: TransactionType,
        fromId: string,
        toId: string,
    ) => void;
    onSelectCategory: (category: Category) => void;
    title: string;
    transactions: Transaction[];
}) {
    const [activeCategory, setActiveCategory] = useState<Category | null>(null);
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );
    const categoryIds = useMemo(
        () => categories.map((category) => category.id),
        [categories],
    );
    const totalsByCategoryId = useMemo(() => {
        const totals = new Map<string, number>();

        transactions.forEach((transaction) => {
            totals.set(
                transaction.categoryId,
                (totals.get(transaction.categoryId) ?? 0) + transaction.amount,
            );
        });

        return totals;
    }, [transactions]);
    const budgetsByCategoryId = useMemo(() => {
        const budgetMap = new Map<string, Budget>();

        budgets.forEach((budget) => {
            budgetMap.set(budget.categoryId, budget);
        });

        return budgetMap;
    }, [budgets]);

    useEffect(() => {
        if (!activeCategory) {
            return;
        }

        const previousCursor = document.body.style.cursor;
        document.body.style.cursor = "grabbing";

        return () => {
            document.body.style.cursor = previousCursor;
        };
    }, [activeCategory]);

    const handleDragStart = (event: DragStartEvent) => {
        const category = categories.find(
            (item) => item.id === String(event.active.id),
        );
        setActiveCategory(category ?? null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const activeId = String(event.active.id);
        const overId = event.over ? String(event.over.id) : null;
        setActiveCategory(null);

        if (!overId || activeId === overId) {
            return;
        }

        onReorderCategory(
            normalizeTransactionType(categories[0]?.type ?? "expense"),
            activeId,
            overId,
        );
    };

    return (
        <section>
            <h2 className="mb-3 text-xl font-medium leading-7">{title}</h2>
            {categories.length === 0 ? (
                <EmptyState
                    title={`No ${title.toLowerCase()} categories yet`}
                    description="Create categories to start adding transactions quickly."
                />
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragCancel={() => setActiveCategory(null)}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={categoryIds}
                        strategy={rectSortingStrategy}
                    >
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                            {categories.map((category) => (
                                <SortableCategoryCard
                                    key={category.id}
                                    category={category}
                                    disabled={!editMode}
                                    editMode={editMode}
                                    isOverlay={false}
                                    onDeleteCategory={onDeleteCategory}
                                    onEditCategory={onEditCategory}
                                    onSelectCategory={onSelectCategory}
                                    budget={budgetsByCategoryId.get(
                                        category.id,
                                    )}
                                    total={
                                        totalsByCategoryId.get(category.id) ?? 0
                                    }
                                />
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay adjustScale={false}>
                        {activeCategory ? (
                            <SortableCategoryCard
                                category={activeCategory}
                                disabled
                                editMode={editMode}
                                isOverlay
                                onDeleteCategory={onDeleteCategory}
                                onEditCategory={onEditCategory}
                                onSelectCategory={onSelectCategory}
                                budget={budgetsByCategoryId.get(
                                    activeCategory.id,
                                )}
                                total={
                                    totalsByCategoryId.get(activeCategory.id) ??
                                    0
                                }
                            />
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}
        </section>
    );
}

function SortableCategoryCard({
    budget,
    category,
    disabled,
    editMode,
    isOverlay,
    onDeleteCategory,
    onEditCategory,
    onSelectCategory,
    total,
}: {
    budget?: Budget;
    category: Category;
    disabled: boolean;
    editMode: boolean;
    isOverlay: boolean;
    onDeleteCategory: (category: Category) => void;
    onEditCategory: (category: Category) => void;
    onSelectCategory: (category: Category) => void;
    total: number;
}) {
    const {
        attributes,
        isDragging,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        disabled,
        id: category.id,
    });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    const hasBudgetTracking =
        normalizeTransactionType(category.type) === "expense";

    return (
        <div
            ref={isOverlay ? undefined : setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "relative rounded-md border border-border bg-white p-3 text-left transition-[border-color,box-shadow,opacity] md:hover:border-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:p-4",
                editMode &&
                    "cursor-grab touch-none select-none md:hover:border-border active:cursor-grabbing",
                isDragging && "opacity-20",
                isOverlay &&
                    "cursor-grabbing border-[#2563EB] shadow-[0_22px_55px_rgba(37,99,235,0.24)]",
            )}
            role="button"
            tabIndex={0}
            onClick={() => {
                if (!editMode) {
                    onSelectCategory(category);
                }
            }}
            onKeyDown={(event) => {
                if (!editMode && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    onSelectCategory(category);
                }
            }}
        >
            <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                    <CategoryIconBadge category={category} />
                    {editMode && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                            <GripVertical className="h-4 w-4" aria-hidden />
                            <span className="sr-only">Drag to reorder</span>
                        </span>
                    )}
                </div>
                <div className="h-8 w-8 shrink-0">
                    {editMode && !isOverlay && (
                        <CategoryCardActionMenu
                            category={category}
                            onDeleteCategory={onDeleteCategory}
                            onEditCategory={onEditCategory}
                        />
                    )}
                </div>
            </div>
            <p className="truncate text-sm font-medium leading-5">
                {category.name}
            </p>
            {hasBudgetTracking && (
                <div className="mt-3">
                    <div
                        aria-label={`${category.name} budget progress`}
                        className="h-1.5 overflow-hidden rounded-full bg-neutral-100"
                    >
                        {budget && (
                            <div
                                className={cn(
                                    "h-full rounded-full bg-neutral-900",
                                    total > budget.limit && "bg-destructive",
                                )}
                                style={{
                                    width: `${Math.min(
                                        100,
                                        budget.limit > 0
                                            ? (total / budget.limit) * 100
                                            : 0,
                                    )}%`,
                                }}
                            />
                        )}
                    </div>
                </div>
            )}
            <div className="mt-3 flex items-end justify-between gap-3">
                <span className="text-sm font-medium leading-5">
                    {formatCurrency(total)}
                </span>
                {hasBudgetTracking && (
                    <span
                        className={cn(
                            "text-right text-xs font-medium leading-4 text-muted-foreground",
                            budget && total > budget.limit && "text-destructive",
                        )}
                    >
                        {budget
                            ? total > budget.limit
                                ? `${formatCurrency(total - budget.limit)} excess`
                                : `${formatCurrency(budget.limit - total)} remaining`
                            : "No budget set"}
                    </span>
                )}
            </div>
        </div>
    );
}

function CategoryCardActionMenu({
    category,
    onDeleteCategory,
    onEditCategory,
}: {
    category: Category;
    onDeleteCategory: (category: Category) => void;
    onEditCategory: (category: Category) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handlePointerDown(event: PointerEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [isOpen]);

    return (
        <div className="relative z-20" ref={menuRef}>
            <Button
                aria-expanded={isOpen}
                aria-haspopup="menu"
                className="h-8 w-8 rounded-md md:hover:bg-neutral-100"
                type="button"
                variant="ghost"
                size="icon"
                onClick={(event) => {
                    event.stopPropagation();
                    setIsOpen((open) => !open);
                }}
                onPointerDown={(event) => event.stopPropagation()}
            >
                <Ellipsis className="h-5 w-5" aria-hidden />
                <span className="sr-only">Open {category.name} menu</span>
            </Button>
            {isOpen && (
                <div
                    className="absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-lg border border-border bg-white p-2 shadow-[0_18px_50px_rgba(0,0,0,0.12)]"
                    role="menu"
                    onPointerDown={(event) => event.stopPropagation()}
                >
                    <button
                        className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-sm leading-5 md:hover:bg-neutral-100"
                        role="menuitem"
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onEditCategory(category);
                            setIsOpen(false);
                        }}
                    >
                        <Edit3 className="h-4 w-4" aria-hidden />
                        Edit
                    </button>
                    <button
                        className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-sm leading-5 text-destructive md:hover:bg-neutral-100"
                        role="menuitem"
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onDeleteCategory(category);
                            setIsOpen(false);
                        }}
                    >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}

function QuickTransactionModal({
    budget,
    category,
    month,
    onClose,
    onSetBudget,
    onSubmit,
}: {
    budget?: Budget;
    category: Category;
    month: string;
    onClose: () => void;
    onSetBudget: (limit: number) => void;
    onSubmit: (values: {
        amount: number;
        date: string;
        subcategory: string;
    }) => void;
}) {
    const subcategories = getSubcategoriesForCategory(category);
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(toDateInputValue(new Date()));
    const [selectedSubcategory, setSelectedSubcategory] = useState(
        subcategories[0] ?? "General",
    );
    const parsedAmount = parseDecimalInput(amount);
    const canSubmit = Number.isFinite(parsedAmount) && parsedAmount > 0;
    const [limit, setLimit] = useState("");
    const parsedLimit = parseDecimalInput(limit);
    const canSetBudget = Number.isFinite(parsedLimit) && parsedLimit > 0;
    const requiresBudget =
        normalizeTransactionType(category.type) === "expense";

    if (requiresBudget && !budget) {
        return (
            <EditModal onClose={onClose}>
                <Card className="overflow-hidden rounded-2xl bg-white">
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();

                            if (!canSetBudget) {
                                return;
                            }

                            onSetBudget(parsedLimit);
                        }}
                    >
                        <CardHeader className="px-6 pb-2 pt-5">
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <CategoryIconBadge category={category} />
                            </div>
                            <CardTitle className="text-2xl font-medium leading-8">
                                No Budget Set
                            </CardTitle>
                            <p className="text-base leading-6 text-muted-foreground">
                                Set a limit for {category.name} before adding
                                transactions.
                            </p>
                        </CardHeader>
                        <CardContent className="px-6 pb-6 pt-0">
                            <FieldError>
                                <Label htmlFor="quick-budget-limit">
                                    Limit
                                </Label>
                                <Input
                                    autoFocus
                                    id="quick-budget-limit"
                                    inputMode="decimal"
                                    onInput={handleDecimalInput}
                                    pattern="[0-9]*[.]?[0-9]*"
                                    type="text"
                                    value={limit}
                                    onChange={(event) =>
                                        setLimit(event.currentTarget.value)
                                    }
                                />
                            </FieldError>
                        </CardContent>
                        <div className="flex items-center justify-between rounded-b-2xl border-t border-border bg-neutral-50 px-5 py-4">
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={onClose}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={!canSetBudget}>
                                Set budget
                            </Button>
                        </div>
                    </form>
                </Card>
            </EditModal>
        );
    }

    return (
        <EditModal onClose={onClose}>
            <Card className="overflow-visible rounded-2xl bg-white">
                <form
                    onSubmit={(event) => {
                        event.preventDefault();

                        if (!canSubmit) {
                            return;
                        }

                        onSubmit({
                            amount: parsedAmount,
                            date,
                            subcategory: selectedSubcategory,
                        });
                    }}
                >
                    <CardHeader className="px-6 pb-2 pt-5">
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <CategoryIconBadge category={category} />
                            <div className="w-[164px]">
                                <DatePickerInput
                                    ariaLabel="Select transaction date"
                                    displayTodayLabel
                                    popoverAlign="right"
                                    value={date}
                                    onChange={setDate}
                                />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-medium leading-8">
                            Add {category.name}
                        </CardTitle>
                        <p className="text-base leading-6 text-muted-foreground">
                            Record this {category.type} for{" "}
                            {formatMonthLabel(month)}.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-5 px-6 pb-6 pt-0">
                        <FieldError>
                            <Label htmlFor="quick-amount">Amount</Label>
                            <Input
                                autoFocus
                                id="quick-amount"
                                inputMode="decimal"
                                onInput={handleDecimalInput}
                                pattern="[0-9]*[.]?[0-9]*"
                                type="text"
                                value={amount}
                                onChange={(event) =>
                                    setAmount(event.currentTarget.value)
                                }
                            />
                        </FieldError>
                        <div>
                            <Label>Subcategory</Label>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {subcategories.map((subcategory) => {
                                    const selected =
                                        selectedSubcategory === subcategory;

                                    return (
                                        <button
                                            key={subcategory}
                                            className={cn(
                                                "h-10 rounded-md border border-border bg-white px-4 text-sm font-medium leading-5 transition-colors md:hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                                selected &&
                                                    "border-primary bg-primary text-primary-foreground md:hover:bg-primary",
                                            )}
                                            type="button"
                                            onClick={() =>
                                                setSelectedSubcategory(
                                                    subcategory,
                                                )
                                            }
                                        >
                                            {subcategory}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                    <div className="flex items-center justify-between rounded-b-2xl border-t border-border bg-neutral-50 px-5 py-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!canSubmit}>
                            <Plus className="h-4 w-4" aria-hidden />
                            Add transaction
                        </Button>
                    </div>
                </form>
            </Card>
        </EditModal>
    );
}

function DashboardView({
    budgets,
    categories,
    cashflowData,
    spendingByCategory,
    transactions,
}: {
    budgets: Budget[];
    categories: Category[];
    cashflowData: Array<{ date: string; income: number; expense: number }>;
    spendingByCategory: Array<{ name: string; value: number; color: string }>;
    transactions: Transaction[];
}) {
    const expenses = transactions.filter(
        (transaction) => transaction.type === "expense",
    );

    return (
        <div className="grid gap-4 md:gap-5 lg:grid-cols-[1.4fr_0.6fr]">
            <BudgetProgressList
                budgets={budgets}
                categories={categories}
                transactions={expenses}
            />

            <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Spending</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Expense mix by category
                        </p>
                    </div>
                </CardHeader>
                <CardContent>
                    {spendingByCategory.length > 0 ? (
                        <div>
                            <div className="h-56 md:h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RePieChart>
                                        <Pie
                                            data={spendingByCategory}
                                            dataKey="value"
                                            nameKey="name"
                                            innerRadius={56}
                                            outerRadius={86}
                                            paddingAngle={3}
                                        >
                                            {spendingByCategory.map((entry) => (
                                                <Cell
                                                    key={entry.name}
                                                    fill={entry.color}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value) =>
                                                formatCurrency(Number(value))
                                            }
                                        />
                                    </RePieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                                {spendingByCategory.map((entry) => (
                                    <div
                                        key={entry.name}
                                        className="flex min-w-0 items-center gap-2 text-sm leading-5"
                                    >
                                        <span
                                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                                            style={{
                                                backgroundColor: entry.color,
                                            }}
                                        />
                                        <span className="truncate">
                                            {entry.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <EmptyState
                            className="flex h-56 flex-col items-center justify-center md:h-72"
                            title="No spending yet"
                            description="Expense transactions will appear here by category."
                        />
                    )}
                </CardContent>
            </Card>

            <CashflowCard cashflowData={cashflowData} />
            <RecentTransactions
                categories={categories}
                transactions={transactions.slice(0, 6)}
            />
        </div>
    );
}

function CashflowCard({
    cashflowData,
}: {
    cashflowData: Array<{ date: string; income: number; expense: number }>;
}) {
    return (
        <Card className="flex h-full flex-col">
            <CardHeader>
                <div>
                    <CardTitle>Cashflow</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Income and expenses by transaction date
                    </p>
                </div>
            </CardHeader>
            <CardContent>
                {cashflowData.length > 0 ? (
                    <div className="h-56 md:h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={cashflowData}>
                                <CartesianGrid
                                    stroke="#E5E7EB"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis tickLine={false} axisLine={false} />
                                <Tooltip
                                    content={<CashflowTooltip />}
                                    cursor={{ fill: "#E5E5E5" }}
                                    wrapperStyle={{ outline: "none" }}
                                />
                                <Bar
                                    dataKey="income"
                                    fill="#171717"
                                    radius={[4, 4, 0, 0]}
                                />
                                <Bar
                                    dataKey="expense"
                                    fill="#2563EB"
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <EmptyState
                        className="flex h-56 flex-col items-center justify-center md:h-72"
                        title="No cashflow yet"
                        description="Add your first transaction to populate this chart."
                    />
                )}
            </CardContent>
        </Card>
    );
}

function CashflowTooltip({
    active,
    label,
}: {
    active?: boolean;
    label?: string | number;
}) {
    if (!active || !label) {
        return null;
    }

    return (
        <div className="pointer-events-none relative rounded-md border border-border bg-white px-3 py-2 text-sm leading-5 text-foreground shadow-[0_14px_34px_rgba(0,0,0,0.12)]">
            <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-l border-t border-border bg-white" />
            {label}
        </div>
    );
}

function BackupOverflowMenu({
    error,
    exportLabel,
    importInputRef,
    onExport,
    onImportClick,
    onImportFile,
}: {
    error: string | null;
    exportLabel: "transactions" | "budgets";
    importInputRef: React.RefObject<HTMLInputElement>;
    onExport: () => void;
    onImportClick: () => void;
    onImportFile: (file: File) => void;
}) {
    const title = exportLabel.charAt(0).toUpperCase() + exportLabel.slice(1);
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handlePointerDown(event: PointerEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={menuRef}>
            <Button
                aria-expanded={isOpen}
                aria-haspopup="menu"
                className="h-8 w-8 rounded-md md:hover:bg-neutral-100"
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen((open) => !open)}
            >
                <Ellipsis className="h-5 w-5" aria-hidden />
                <span className="sr-only">Open {title} backup menu</span>
            </Button>
            {isOpen && (
                <div
                    className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-lg border border-border bg-white p-2 shadow-[0_18px_50px_rgba(0,0,0,0.12)]"
                    role="menu"
                >
                    <button
                        className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-sm leading-5 md:hover:bg-neutral-100"
                        role="menuitem"
                        type="button"
                        onClick={() => {
                            onExport();
                            setIsOpen(false);
                        }}
                    >
                        <Download className="h-4 w-4" aria-hidden />
                        Export {title}
                    </button>
                    <button
                        className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-sm leading-5 md:hover:bg-neutral-100"
                        role="menuitem"
                        type="button"
                        onClick={() => {
                            onImportClick();
                            setIsOpen(false);
                        }}
                    >
                        <Upload className="h-4 w-4" aria-hidden />
                        Import {title}
                    </button>
                </div>
            )}
            <input
                ref={importInputRef}
                className="hidden"
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";

                    if (file) {
                        onImportFile(file);
                    }
                }}
            />
            {error && (
                <p className="absolute right-0 top-10 z-10 w-64 text-right text-xs leading-4 text-destructive sm:w-80">
                    {error}
                </p>
            )}
        </div>
    );
}

function ImportConfirmationModal({
    count,
    itemLabel,
    onCancel,
    onConfirm,
}: {
    count: number;
    itemLabel: "transactions" | "budgets";
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <EditModal onClose={onCancel}>
            <Card className="overflow-hidden rounded-2xl bg-white">
                <div className="px-6 pb-6 pt-5">
                    <CardTitle className="text-2xl font-medium leading-8">
                        Replace existing {itemLabel}?
                    </CardTitle>
                    <p className="mt-2 text-base leading-6 text-muted-foreground">
                        This import contains {count} {itemLabel}. Continuing
                        will replace the {itemLabel} currently shown on this
                        page and then save the imported backup.
                    </p>
                </div>
                <div className="flex items-center justify-between border-t border-border bg-neutral-50 px-5 py-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                    <Button type="button" onClick={onConfirm}>
                        Replace {itemLabel}
                    </Button>
                </div>
            </Card>
        </EditModal>
    );
}

function DeleteCategoryConfirmationModal({
    category,
    onCancel,
    onConfirm,
}: {
    category: Category;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    return (
        <EditModal onClose={onCancel}>
            <Card className="overflow-hidden rounded-2xl bg-white">
                <div className="px-6 pb-6 pt-5">
                    <CardTitle className="text-2xl font-medium leading-8">
                        Delete {category.name}?
                    </CardTitle>
                    <p className="mt-2 text-base leading-6 text-muted-foreground">
                        This will remove the card, its transactions, and any
                        budgets linked to this category.
                    </p>
                </div>
                <div className="flex items-center justify-between border-t border-border bg-neutral-50 px-5 py-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onCancel}
                    >
                        Cancel
                    </Button>
                    <Button type="button" onClick={onConfirm}>
                        Delete card
                    </Button>
                </div>
            </Card>
        </EditModal>
    );
}

function ImportLoadingModal({
    itemLabel,
}: {
    itemLabel: "transactions" | "budgets";
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
            <div className="absolute inset-0 cursor-default bg-white/45 backdrop-blur-sm" />
            <Card
                className="relative w-full max-w-[360px] rounded-2xl bg-white p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
                role="dialog"
                aria-modal="true"
                aria-live="polite"
            >
                <span
                    className="mx-auto flex h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-foreground"
                    aria-hidden
                />
                <CardTitle className="mt-4 text-xl font-medium leading-7">
                    Importing {itemLabel}
                </CardTitle>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">
                    Reading the backup and saving it to your account...
                </p>
            </Card>
        </div>
    );
}

function TransactionsView({
    allTransactions,
    categories,
    editingId,
    month,
    onCancelEdit,
    onDelete,
    onEdit,
    onImport,
    onSubmit,
    transactions,
}: {
    allTransactions: Transaction[];
    categories: Category[];
    editingId: string | null;
    month: string;
    onCancelEdit: () => void;
    onDelete: (id: string) => void;
    onEdit: (transaction: Transaction) => void;
    onImport: (
        transactions: Transaction[],
        categories?: Category[],
    ) => Promise<void>;
    onSubmit: (values: TransactionFormValues) => void;
    transactions: Transaction[];
}) {
    const editing = transactions.find(
        (transaction) => transaction.id === editingId,
    );
    const importInputRef = useRef<HTMLInputElement>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [pendingImport, setPendingImport] =
        useState<TransactionImportResult | null>(null);

    async function handleImportFile(file: File) {
        setIsImporting(true);
        let nextImport: TransactionImportResult;

        try {
            nextImport = parseTransactionBackupPayload(
                JSON.parse(await file.text()),
                categories,
            );
        } catch {
            setImportError(
                "Transactions could not be imported. Check that this is a Kwarta transactions JSON backup.",
            );
            setIsImporting(false);
            return;
        }

        setImportError(null);

        if (allTransactions.length > 0) {
            setPendingImport(nextImport);
            setIsImporting(false);
            return;
        }

        try {
            await onImport(nextImport.transactions, nextImport.categories);
        } catch {
            setImportError(
                "Imported transactions could not be saved. Please try importing again.",
            );
        } finally {
            setIsImporting(false);
        }
    }

    async function confirmImport() {
        if (!pendingImport) {
            return;
        }

        const nextImport = pendingImport;
        setPendingImport(null);
        setIsImporting(true);

        try {
            await onImport(nextImport.transactions, nextImport.categories);
            setImportError(null);
        } catch {
            setImportError(
                "Imported transactions could not be saved. Please try importing again.",
            );
        } finally {
            setIsImporting(false);
        }
    }

    return (
        <>
            <div>
                <TransactionTable
                    categories={categories}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    transactions={transactions}
                    backupMenu={
                        <BackupOverflowMenu
                            error={importError}
                            exportLabel="transactions"
                            importInputRef={importInputRef}
                            onExport={() =>
                                downloadBackupFile(
                                    "transactions",
                                    allTransactions,
                                    categories,
                                )
                            }
                            onImportClick={() =>
                                importInputRef.current?.click()
                            }
                            onImportFile={handleImportFile}
                        />
                    }
                />
            </div>
            {editing && (
                <EditModal onClose={onCancelEdit}>
                    <TransactionForm
                        categories={categories}
                        editing={editing}
                        month={month}
                        onCancel={onCancelEdit}
                        onSubmit={onSubmit}
                    />
                </EditModal>
            )}
            {pendingImport && (
                <ImportConfirmationModal
                    count={pendingImport.transactions.length}
                    itemLabel="transactions"
                    onCancel={() => setPendingImport(null)}
                    onConfirm={confirmImport}
                />
            )}
            {isImporting && <ImportLoadingModal itemLabel="transactions" />}
        </>
    );
}

function TransactionForm({
    categories,
    editing,
    month,
    onCancel,
    onSubmit,
}: {
    categories: Category[];
    editing?: Transaction;
    month: string;
    onCancel: () => void;
    onSubmit: (values: TransactionFormValues) => void;
}) {
    const transactionDefaults = useMemo<TransactionFormValues>(
        () => ({
            type: "expense",
            amount: 0,
            categoryId: getFirstCategoryId(categories, "expense"),
            merchant: "",
            note: "",
            date: getDefaultTransactionDate(month),
        }),
        [categories, month],
    );
    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: editing ?? transactionDefaults,
    });
    const type = normalizeTransactionType(form.watch("type") ?? "expense");
    const selectedCategoryId = form.watch("categoryId");
    const selectedSubcategory = form.watch("merchant");
    const availableCategories = useMemo(
        () =>
            categories.filter(
                (category) => normalizeTransactionType(category.type) === type,
            ),
        [categories, type],
    );
    const selectedCategory = availableCategories.find(
        (category) => category.id === selectedCategoryId,
    );
    const subcategories = useMemo(
        () =>
            selectedCategory
                ? getSubcategoriesForCategory(selectedCategory)
                : [],
        [selectedCategory],
    );

    useEffect(() => {
        form.reset(editing ?? transactionDefaults);
    }, [editing, form, transactionDefaults]);

    useEffect(() => {
        const currentCategoryId = form.getValues("categoryId");
        const currentCategoryIsValid = availableCategories.some(
            (category) => category.id === currentCategoryId,
        );

        if (!currentCategoryIsValid) {
            const nextCategoryId = availableCategories[0]?.id ?? "";

            if (nextCategoryId !== currentCategoryId) {
                form.setValue("categoryId", nextCategoryId, {
                    shouldValidate: true,
                });
            }
        }
    }, [availableCategories, form]);

    useEffect(() => {
        const currentSubcategory = form.getValues("merchant");

        if (
            subcategories.length > 0 &&
            !subcategories.includes(currentSubcategory)
        ) {
            form.setValue("merchant", subcategories[0], {
                shouldValidate: true,
            });
        }
    }, [form, subcategories]);

    const isEditing = Boolean(editing);

    return (
        <Card
            className={cn(isEditing && "overflow-visible rounded-2xl bg-white")}
        >
            <form
                onSubmit={form.handleSubmit((values) => {
                    onSubmit(values);
                    form.reset(transactionDefaults);
                })}
            >
                <CardHeader className={cn(isEditing && "px-6 pb-2 pt-5")}>
                    <CardTitle
                        className={cn(
                            isEditing && "text-2xl font-medium leading-8",
                        )}
                    >
                        {editing ? "Edit transaction" : "Add transaction"}
                    </CardTitle>
                    <p
                        className={cn(
                            "text-sm text-muted-foreground",
                            isEditing && "text-base leading-6",
                        )}
                    >
                        {editing
                            ? "Update this transaction's amount, subcategory, category, and date."
                            : "Record a new income or expense with its subcategory, category, and date."}
                    </p>
                </CardHeader>
                <CardContent
                    className={cn("space-y-4", isEditing && "px-6 pb-6 pt-0")}
                >
                    <div className="grid grid-cols-2 gap-3">
                        <FieldError
                            message={form.formState.errors.type?.message}
                        >
                            <Label htmlFor="transaction-type">Type</Label>
                            <Select
                                id="transaction-type"
                                onValueChange={(value) => {
                                    const nextType = value as TransactionType;
                                    const nextCategory = getFirstCategoryId(
                                        categories,
                                        nextType,
                                    );

                                    form.setValue("type", nextType, {
                                        shouldValidate: true,
                                    });
                                    form.setValue("categoryId", nextCategory, {
                                        shouldValidate: true,
                                    });
                                }}
                                options={[
                                    { label: "Expense", value: "expense" },
                                    { label: "Income", value: "income" },
                                ]}
                                value={type}
                            />
                        </FieldError>
                        <FieldError
                            message={form.formState.errors.amount?.message}
                        >
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                                id="amount"
                                inputMode="decimal"
                                onInput={handleDecimalInput}
                                pattern="[0-9]*[.]?[0-9]*"
                                type="text"
                                {...form.register("amount", {
                                    setValueAs: parseDecimalInput,
                                })}
                            />
                        </FieldError>
                    </div>
                    <FieldError
                        message={form.formState.errors.categoryId?.message}
                    >
                        <Label htmlFor="transaction-category">Category</Label>
                        <Select
                            disabled={availableCategories.length === 0}
                            id="transaction-category"
                            onValueChange={(value) =>
                                form.setValue("categoryId", value, {
                                    shouldValidate: true,
                                })
                            }
                            options={availableCategories.map((category) => ({
                                label: category.name,
                                value: category.id,
                            }))}
                            placeholder={`Create a ${type} category first`}
                            value={form.watch("categoryId")}
                        />
                    </FieldError>
                    <FieldError
                        message={form.formState.errors.merchant?.message}
                    >
                        <Label>Subcategory</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {subcategories.map((subcategory) => {
                                const selected =
                                    selectedSubcategory === subcategory;

                                return (
                                    <button
                                        key={subcategory}
                                        className={cn(
                                            "h-10 rounded-md border border-border bg-white px-4 text-sm font-medium leading-5 transition-colors md:hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                            selected &&
                                                "border-primary bg-primary text-primary-foreground md:hover:bg-primary",
                                        )}
                                        type="button"
                                        onClick={() =>
                                            form.setValue(
                                                "merchant",
                                                subcategory,
                                                { shouldValidate: true },
                                            )
                                        }
                                    >
                                        {subcategory}
                                    </button>
                                );
                            })}
                        </div>
                    </FieldError>
                    <FieldError message={form.formState.errors.date?.message}>
                        <Label htmlFor="date">Date</Label>
                        <DatePickerInput
                            id="date"
                            value={form.watch("date")}
                            onChange={(value) =>
                                form.setValue("date", value, {
                                    shouldValidate: true,
                                })
                            }
                        />
                    </FieldError>
                </CardContent>
                <div
                    className={cn(
                        "flex justify-end gap-2 px-4 pb-4",
                        isEditing &&
                            "items-center justify-between rounded-b-2xl border-t border-border bg-neutral-50 px-5 py-4",
                    )}
                >
                    {editing && (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                    )}
                    <div
                        className={cn(
                            !editing && "flex gap-2",
                            editing && "ml-auto",
                        )}
                    >
                        <Button type="submit">
                            {!editing && (
                                <Plus className="h-4 w-4" aria-hidden />
                            )}
                            {editing ? "Save changes" : "Add transaction"}
                        </Button>
                    </div>
                </div>
            </form>
        </Card>
    );
}

function BudgetsView({
    allBudgets,
    budgets,
    categories,
    editingId,
    month,
    onCancelEdit,
    onDelete,
    onEdit,
    onImport,
    onSubmit,
    transactions,
}: {
    allBudgets: Budget[];
    budgets: Budget[];
    categories: Category[];
    editingId: string | null;
    month: string;
    onCancelEdit: () => void;
    onDelete: (id: string) => void;
    onEdit: (budget: Budget) => void;
    onImport: (budgets: Budget[]) => Promise<void>;
    onSubmit: (values: BudgetFormValues) => void;
    transactions: Transaction[];
}) {
    const editing = allBudgets.find((budget) => budget.id === editingId);
    const importInputRef = useRef<HTMLInputElement>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [pendingImport, setPendingImport] = useState<Budget[] | null>(null);

    async function handleImportFile(file: File) {
        setIsImporting(true);

        try {
            const nextBudgets = parseBudgetBackupPayload(
                JSON.parse(await file.text()),
                categories,
            );

            setImportError(null);

            if (allBudgets.length > 0) {
                setPendingImport(nextBudgets);
                setIsImporting(false);
                return;
            }

            await onImport(nextBudgets);
        } catch {
            setImportError(
                "Budgets could not be imported. Check that this is a Kwarta budgets JSON backup.",
            );
        } finally {
            setIsImporting(false);
        }
    }

    async function confirmImport() {
        if (!pendingImport) {
            return;
        }

        const nextBudgets = pendingImport;
        setPendingImport(null);
        setIsImporting(true);

        try {
            await onImport(nextBudgets);
            setImportError(null);
        } catch {
            setImportError(
                "Imported budgets could not be saved. Please try importing again.",
            );
        } finally {
            setIsImporting(false);
        }
    }

    return (
        <>
            <div className="space-y-4 md:space-y-5">
                <MonthlyBudgetSummary
                    budgets={budgets}
                    month={month}
                    transactions={transactions.filter(
                        (transaction) => transaction.type === "expense",
                    )}
                />
                <div className="grid gap-4 md:gap-5 lg:grid-cols-[0.75fr_1.25fr]">
                <BudgetForm
                    categories={categories}
                    month={month}
                    onCancel={onCancelEdit}
                    onSubmit={onSubmit}
                />
                <BudgetProgressList
                    actions
                    budgets={budgets}
                    categories={categories}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    transactions={transactions.filter(
                        (transaction) => transaction.type === "expense",
                    )}
                    backupMenu={
                        <BackupOverflowMenu
                            error={importError}
                            exportLabel="budgets"
                            importInputRef={importInputRef}
                            onExport={() =>
                                downloadBackupFile(
                                    "budgets",
                                    allBudgets,
                                    categories,
                                )
                            }
                            onImportClick={() =>
                                importInputRef.current?.click()
                            }
                            onImportFile={handleImportFile}
                        />
                    }
                />
                </div>
            </div>
            {editing && (
                <EditModal onClose={onCancelEdit}>
                    <BudgetForm
                        categories={categories}
                        editing={editing}
                        month={month}
                        onCancel={onCancelEdit}
                        onSubmit={onSubmit}
                    />
                </EditModal>
            )}
            {pendingImport && (
                <ImportConfirmationModal
                    count={pendingImport.length}
                    itemLabel="budgets"
                    onCancel={() => setPendingImport(null)}
                    onConfirm={confirmImport}
                />
            )}
            {isImporting && <ImportLoadingModal itemLabel="budgets" />}
        </>
    );
}

function MonthlyBudgetSummary({
    budgets,
    month,
    transactions,
}: {
    budgets: Budget[];
    month: string;
    transactions: Transaction[];
}) {
    const totalBudget = budgets.reduce((sum, budget) => sum + budget.limit, 0);
    const totalSpent = transactions.reduce(
        (sum, transaction) => sum + transaction.amount,
        0,
    );
    const remaining = totalBudget - totalSpent;
    const isOverBudget = remaining < 0;
    const usage = percent(totalSpent, totalBudget);
    const averageExpensePerDay = totalSpent / getDaysInMonth(month);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Total budget</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Overall spending plan for {formatMonthLabel(month)}.
                </p>
            </CardHeader>
            <CardContent className="space-y-5">
                <div>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium">
                            {formatCurrency(totalSpent)} spent
                        </span>
                        <span className="text-muted-foreground">
                            {formatCurrency(totalBudget)} budget
                        </span>
                    </div>
                    <Progress
                        indicatorClassName={cn(
                            isOverBudget && "bg-destructive",
                        )}
                        value={usage}
                    />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-md border border-border bg-white p-3">
                        <p className="text-sm leading-5 text-muted-foreground">
                            Total spent
                        </p>
                        <p className="mt-1 text-lg font-semibold leading-7">
                            {formatCurrency(totalSpent)}
                        </p>
                    </div>
                    <div className="rounded-md border border-border bg-white p-3">
                        <p className="text-sm leading-5 text-muted-foreground">
                            Total budget
                        </p>
                        <p className="mt-1 text-lg font-semibold leading-7">
                            {formatCurrency(totalBudget)}
                        </p>
                    </div>
                    <div className="rounded-md border border-border bg-white p-3">
                        <p className="text-sm leading-5 text-muted-foreground">
                            Remaining budget
                        </p>
                        <p
                            className={cn(
                                "mt-1 text-lg font-semibold leading-7",
                                isOverBudget && "text-destructive",
                            )}
                        >
                            {formatCurrency(Math.abs(remaining))}{" "}
                            {isOverBudget ? "excess" : "remaining"}
                        </p>
                    </div>
                    <div className="rounded-md border border-border bg-white p-3">
                        <p className="text-sm leading-5 text-muted-foreground">
                            Average expense per day
                        </p>
                        <p className="mt-1 text-lg font-semibold leading-7">
                            {formatCurrency(averageExpensePerDay)}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function BudgetForm({
    categories,
    editing,
    month,
    onCancel,
    onSubmit,
}: {
    categories: Category[];
    editing?: Budget;
    month: string;
    onCancel: () => void;
    onSubmit: (values: BudgetFormValues) => void;
}) {
    const form = useForm<BudgetFormValues>({
        resolver: zodResolver(budgetSchema),
        values: editing ?? {
            categoryId: categories[0]?.id ?? "",
            limit: 0,
            month,
        },
    });

    const isEditing = Boolean(editing);

    return (
        <Card
            className={cn(isEditing && "overflow-visible rounded-2xl bg-white")}
        >
            <form
                onSubmit={form.handleSubmit((values) => {
                    onSubmit(values);
                    form.reset();
                })}
            >
                <CardHeader className={cn(isEditing && "px-6 pb-2 pt-6")}>
                    <CardTitle
                        className={cn(
                            isEditing && "text-2xl font-medium leading-8",
                        )}
                    >
                        {editing ? "Edit budget" : "Add monthly budget"}
                    </CardTitle>
                    <p
                        className={cn(
                            "text-sm text-muted-foreground",
                            isEditing && "text-base leading-6",
                        )}
                    >
                        Set limits against expense categories.
                    </p>
                </CardHeader>
                <CardContent
                    className={cn("space-y-4", isEditing && "px-6 pb-6 pt-0")}
                >
                    <FieldError
                        message={form.formState.errors.categoryId?.message}
                    >
                        <Label htmlFor="budget-category">Category</Label>
                        <Select
                            disabled={categories.length === 0}
                            id="budget-category"
                            onValueChange={(value) =>
                                form.setValue("categoryId", value, {
                                    shouldValidate: true,
                                })
                            }
                            options={categories.map((category) => ({
                                label: category.name,
                                value: category.id,
                            }))}
                            placeholder="Create an expense category first"
                            value={form.watch("categoryId")}
                        />
                    </FieldError>
                    <FieldError message={form.formState.errors.limit?.message}>
                        <Label htmlFor="limit">Limit</Label>
                        <Input
                            id="limit"
                            inputMode="decimal"
                            onInput={handleDecimalInput}
                            pattern="[0-9]*[.]?[0-9]*"
                            type="text"
                            {...form.register("limit", {
                                setValueAs: parseDecimalInput,
                            })}
                        />
                    </FieldError>
                    <FieldError message={form.formState.errors.month?.message}>
                        <Label htmlFor="month">Month</Label>
                        <MonthPickerInput
                            id="month"
                            value={form.watch("month")}
                            onChange={(value) =>
                                form.setValue("month", value, {
                                    shouldValidate: true,
                                })
                            }
                        />
                    </FieldError>
                </CardContent>
                <div
                    className={cn(
                        "flex justify-end gap-2 px-4 pb-4",
                        isEditing &&
                            "items-center justify-between rounded-b-2xl border-t border-border bg-neutral-50 px-5 py-4",
                    )}
                >
                    {editing && (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                    )}
                    <div
                        className={cn(
                            !editing && "flex gap-2",
                            editing && "ml-auto",
                        )}
                    >
                        <Button type="submit">
                            {!editing && (
                                <Plus className="h-4 w-4" aria-hidden />
                            )}
                            {editing ? "Save budget" : "Add budget"}
                        </Button>
                    </div>
                </div>
            </form>
        </Card>
    );
}

function CategoriesView({
    categories,
    editingId,
    expenseCategories,
    incomeCategories,
    onCancelEdit,
    onDelete,
    onEdit,
    onSubmit,
}: {
    categories: Category[];
    editingId: string | null;
    expenseCategories: Category[];
    incomeCategories: Category[];
    onCancelEdit: () => void;
    onDelete: (id: string) => void;
    onEdit: (category: Category) => void;
    onSubmit: (values: CategoryFormValues) => void;
}) {
    const editing = categories.find((category) => category.id === editingId);

    return (
        <>
            <div className="grid gap-4 md:gap-5 lg:grid-cols-[0.75fr_1.25fr]">
                <CategoryForm onCancel={onCancelEdit} onSubmit={onSubmit} />
                <div className="grid gap-4 md:grid-cols-2 md:gap-5">
                    <CategoryList
                        title="Income categories"
                        description="Sources for money coming in."
                        categories={incomeCategories}
                        onDelete={onDelete}
                        onEdit={onEdit}
                    />
                    <CategoryList
                        title="Expense categories"
                        description="Groups for money going out."
                        categories={expenseCategories}
                        onDelete={onDelete}
                        onEdit={onEdit}
                    />
                </div>
            </div>
            {editing && (
                <EditModal onClose={onCancelEdit}>
                    <CategoryForm
                        editing={editing}
                        onCancel={onCancelEdit}
                        onSubmit={onSubmit}
                    />
                </EditModal>
            )}
        </>
    );
}

function CategoryForm({
    editing,
    modal = false,
    onCancel,
    onSubmit,
}: {
    editing?: Category;
    modal?: boolean;
    onCancel: () => void;
    onSubmit: (values: CategoryFormValues) => void;
}) {
    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema),
        values: editing ?? {
            name: "",
            type: "expense",
            color: colorChoices[0],
            icon: "receipt",
        },
    });
    const selectedColor = form.watch("color");
    const selectedIcon = form.watch("icon");

    const isEditing = Boolean(editing);
    const isModal = isEditing || modal;

    return (
        <Card
            className={cn(isModal && "overflow-visible rounded-2xl bg-white")}
        >
            <form
                onSubmit={form.handleSubmit((values) => {
                    onSubmit(values);
                    form.reset();
                })}
            >
                <CardHeader className={cn(isModal && "px-6 pb-2 pt-5")}>
                    <CardTitle
                        className={cn(
                            isModal && "text-2xl font-medium leading-8",
                        )}
                    >
                        {editing ? "Edit category" : "Create category"}
                    </CardTitle>
                    <p
                        className={cn(
                            "text-sm text-muted-foreground",
                            isModal && "text-base leading-6",
                        )}
                    >
                        {editing
                            ? "Update the name, type, color, and icon for this category."
                            : "Choose how this category appears on your home cards and reports."}
                    </p>
                </CardHeader>
                <CardContent
                    className={cn("space-y-4", isModal && "px-6 pb-6 pt-0")}
                >
                    <FieldError message={form.formState.errors.name?.message}>
                        <Label htmlFor="category-name">Name</Label>
                        <Input id="category-name" {...form.register("name")} />
                    </FieldError>
                    <FieldError message={form.formState.errors.type?.message}>
                        <Label htmlFor="category-type">Type</Label>
                        <Select
                            id="category-type"
                            onValueChange={(value) =>
                                form.setValue(
                                    "type",
                                    value as TransactionType,
                                    {
                                        shouldValidate: true,
                                    },
                                )
                            }
                            options={[
                                { label: "Expense", value: "expense" },
                                { label: "Income", value: "income" },
                            ]}
                            value={form.watch("type")}
                        />
                    </FieldError>
                    <div>
                        <Label>Color</Label>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {colorChoices.map((color) => (
                                <button
                                    key={color}
                                    aria-label={`Use ${color}`}
                                    className={cn(
                                        "h-8 w-8 rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        selectedColor === color &&
                                            "ring-2 ring-ring ring-offset-2",
                                    )}
                                    style={{ backgroundColor: color }}
                                    type="button"
                                    onClick={() =>
                                        form.setValue("color", color)
                                    }
                                />
                            ))}
                        </div>
                    </div>
                    <FieldError message={form.formState.errors.icon?.message}>
                        <Label>Icon</Label>
                        <div className="mt-2 flex max-w-[560px] flex-wrap gap-2">
                            {categoryIconChoices.map((choice) => {
                                const Icon = choice.icon;
                                const isSelected =
                                    selectedIcon === choice.value;

                                return (
                                    <button
                                        key={choice.value}
                                        aria-label={`Use ${choice.label} icon`}
                                        className={cn(
                                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors md:hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                            isSelected &&
                                                "border-[#2563EB] bg-[#E8F0FE] text-[#0B57D0] ring-2 ring-[#2563EB]/20",
                                        )}
                                        type="button"
                                        onClick={() =>
                                            form.setValue(
                                                "icon",
                                                choice.value,
                                                { shouldValidate: true },
                                            )
                                        }
                                    >
                                        <Icon className="h-4 w-4" aria-hidden />
                                    </button>
                                );
                            })}
                        </div>
                    </FieldError>
                </CardContent>
                <div
                    className={cn(
                        "flex justify-end gap-2 px-4 pb-4",
                        isModal &&
                            "items-center justify-between rounded-b-2xl border-t border-border bg-neutral-50 px-5 py-4",
                    )}
                >
                    {isModal && (
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                    )}
                    <div
                        className={cn(
                            !isModal && "flex gap-2",
                            isModal && "ml-auto",
                        )}
                    >
                        <Button type="submit">
                            {!editing && (
                                <Plus className="h-4 w-4" aria-hidden />
                            )}
                            {editing ? "Save category" : "Add category"}
                        </Button>
                    </div>
                </div>
            </form>
        </Card>
    );
}

function BudgetProgressList({
    actions = false,
    backupMenu,
    budgets,
    categories,
    onDelete,
    onEdit,
    transactions,
}: {
    actions?: boolean;
    backupMenu?: React.ReactNode;
    budgets: Budget[];
    categories: Category[];
    onDelete?: (id: string) => void;
    onEdit?: (budget: Budget) => void;
    transactions: Transaction[];
}) {
    return (
        <Card className="flex h-full flex-col">
            <CardHeader>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle>Budget progress</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Monthly limits compared with posted spend.
                        </p>
                    </div>
                    {backupMenu}
                </div>
            </CardHeader>
            <CardContent
                className={cn(
                    "space-y-4",
                    budgets.length === 0 && "flex flex-1",
                )}
            >
                {budgets.length === 0 && (
                    <EmptyState
                        className="flex min-h-56 flex-1 flex-col items-center justify-center md:min-h-72"
                        title="No budgets yet"
                        description="Create a monthly budget after adding expense categories."
                    />
                )}
                {budgets.map((budget) => {
                    const category = categories.find(
                        (item) => item.id === budget.categoryId,
                    );
                    const spent = transactions
                        .filter(
                            (transaction) =>
                                transaction.categoryId === budget.categoryId,
                        )
                        .reduce(
                            (sum, transaction) => sum + transaction.amount,
                            0,
                        );
                    const usage = percent(spent, budget.limit);
                    const remaining = budget.limit - spent;
                    const isOverBudget = remaining < 0;

                    return (
                        <div
                            key={budget.id}
                            className="rounded-md border bg-white p-3 md:p-4"
                        >
                            <div className="mb-3 flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-medium leading-6">
                                        {category?.name ?? "Deleted category"}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatCurrency(spent)} of{" "}
                                        {formatCurrency(budget.limit)} in{" "}
                                        {budget.month}
                                        <span
                                            className={cn(
                                                "ml-2 inline-flex",
                                                isOverBudget &&
                                                    "text-destructive",
                                            )}
                                        >
                                            {formatCurrency(
                                                Math.abs(remaining),
                                            )}{" "}
                                            {isOverBudget
                                                ? "excess"
                                                : "remaining"}
                                        </span>
                                    </p>
                                </div>
                                {actions && (
                                    <div className="flex gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onEdit?.(budget)}
                                        >
                                            <Edit3
                                                className="h-4 w-4"
                                                aria-hidden
                                            />
                                            <span className="sr-only">
                                                Edit budget
                                            </span>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                                onDelete?.(budget.id)
                                            }
                                        >
                                            <Trash2
                                                className="h-4 w-4"
                                                aria-hidden
                                            />
                                            <span className="sr-only">
                                                Delete budget
                                            </span>
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <Progress
                                indicatorClassName={cn(
                                    isOverBudget && "bg-destructive",
                                )}
                                value={usage}
                            />
                        </div>
                    );
                })}
            </CardContent>
        </Card>
    );
}

function RecentTransactions({
    categories,
    transactions,
}: {
    categories: Category[];
    transactions: Transaction[];
}) {
    return (
        <Card className="flex h-full flex-col">
            <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Latest income and expense entries.
                </p>
            </CardHeader>
            <CardContent
                className={cn(transactions.length === 0 && "flex flex-1")}
            >
                {transactions.length === 0 ? (
                    <EmptyState
                        className="flex min-h-48 flex-1 flex-col items-center justify-center md:min-h-72"
                        title="No activity yet"
                        description="New transactions will appear here."
                    />
                ) : (
                    <div className="space-y-3">
                        {transactions.map((transaction) => {
                            const category = categories.find(
                                (item) => item.id === transaction.categoryId,
                            );

                            return (
                                <div
                                    key={transaction.id}
                                    className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <TransactionIcon
                                            category={category}
                                            type={transaction.type}
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate font-medium leading-6">
                                                {transaction.merchant}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {category?.name ??
                                                    "Uncategorized"}{" "}
                                                · {formatDate(transaction.date)}
                                            </p>
                                        </div>
                                    </div>
                                    <p
                                        className={cn(
                                            "shrink-0 font-medium",
                                            transaction.type === "income"
                                                ? "text-[#15803D]"
                                                : "text-[#DC2626]",
                                        )}
                                    >
                                        {transaction.type === "income"
                                            ? "+"
                                            : "-"}
                                        {formatCurrency(transaction.amount)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function TransactionTable({
    backupMenu,
    categories,
    onDelete,
    onEdit,
    transactions,
}: {
    backupMenu?: React.ReactNode;
    categories: Category[];
    onDelete: (id: string) => void;
    onEdit: (transaction: Transaction) => void;
    transactions: Transaction[];
}) {
    return (
        <Card className="flex h-full flex-col">
            <CardHeader>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle>Transactions</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Edit or remove posted money movement.
                        </p>
                    </div>
                    {backupMenu}
                </div>
            </CardHeader>
            <CardContent
                className={cn(transactions.length === 0 && "flex flex-1")}
            >
                {transactions.length === 0 ? (
                    <EmptyState
                        className="flex min-h-64 flex-1 flex-col items-center justify-center md:min-h-80"
                        title="No transactions yet"
                        description="Use the form to add income or expenses."
                    />
                ) : (
                    <>
                        <div className="space-y-3 md:hidden">
                            {transactions.map((transaction) => {
                                const category = categories.find(
                                    (item) =>
                                        item.id === transaction.categoryId,
                                );

                                return (
                                    <div
                                        key={transaction.id}
                                        className="rounded-md border bg-white p-3"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <TransactionIcon
                                                    category={category}
                                                    type={transaction.type}
                                                />
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium leading-6">
                                                        {transaction.merchant}
                                                    </p>
                                                    <p className="text-sm leading-5 text-muted-foreground">
                                                        {category?.name ??
                                                            "Uncategorized"}
                                                    </p>
                                                </div>
                                            </div>
                                            <p
                                                className={cn(
                                                    "shrink-0 self-center text-sm font-medium leading-5",
                                                    transaction.type ===
                                                        "income"
                                                        ? "text-[#15803D]"
                                                        : "text-[#DC2626]",
                                                )}
                                            >
                                                {transaction.type === "income"
                                                    ? "+"
                                                    : "-"}
                                                {formatCurrency(
                                                    transaction.amount,
                                                )}
                                            </p>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between gap-3 border-t pt-3">
                                            <p className="text-sm leading-5 text-muted-foreground">
                                                {formatDate(transaction.date)}
                                            </p>
                                            <div className="flex gap-1">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        onEdit(transaction)
                                                    }
                                                >
                                                    <Edit3
                                                        className="h-4 w-4"
                                                        aria-hidden
                                                    />
                                                    <span className="sr-only">
                                                        Edit transaction
                                                    </span>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        onDelete(transaction.id)
                                                    }
                                                >
                                                    <Trash2
                                                        className="h-4 w-4"
                                                        aria-hidden
                                                    />
                                                    <span className="sr-only">
                                                        Delete transaction
                                                    </span>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full min-w-[680px] text-left text-sm">
                                <thead className="border-b text-muted-foreground">
                                    <tr>
                                        <th className="py-3 font-medium">
                                            Merchant
                                        </th>
                                        <th className="py-3 font-medium">
                                            Category
                                        </th>
                                        <th className="py-3 font-medium">
                                            Date
                                        </th>
                                        <th className="py-3 text-right font-medium">
                                            Amount
                                        </th>
                                        <th className="py-3 text-right font-medium">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((transaction) => {
                                        const category = categories.find(
                                            (item) =>
                                                item.id ===
                                                transaction.categoryId,
                                        );

                                        return (
                                            <tr
                                                key={transaction.id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="py-3">
                                                    <div className="flex items-center gap-3">
                                                        <TransactionIcon
                                                            category={category}
                                                            type={
                                                                transaction.type
                                                            }
                                                        />
                                                        <span className="font-medium">
                                                            {
                                                                transaction.merchant
                                                            }
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3">
                                                    {category?.name ??
                                                        "Uncategorized"}
                                                </td>
                                                <td className="py-3">
                                                    {formatDate(
                                                        transaction.date,
                                                    )}
                                                </td>
                                                <td
                                                    className={cn(
                                                        "py-3 text-right font-medium",
                                                        transaction.type ===
                                                            "income"
                                                            ? "text-[#15803D]"
                                                            : "text-[#DC2626]",
                                                    )}
                                                >
                                                    {transaction.type ===
                                                    "income"
                                                        ? "+"
                                                        : "-"}
                                                    {formatCurrency(
                                                        transaction.amount,
                                                    )}
                                                </td>
                                                <td className="py-3">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                onEdit(
                                                                    transaction,
                                                                )
                                                            }
                                                        >
                                                            <Edit3
                                                                className="h-4 w-4"
                                                                aria-hidden
                                                            />
                                                            <span className="sr-only">
                                                                Edit transaction
                                                            </span>
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                onDelete(
                                                                    transaction.id,
                                                                )
                                                            }
                                                        >
                                                            <Trash2
                                                                className="h-4 w-4"
                                                                aria-hidden
                                                            />
                                                            <span className="sr-only">
                                                                Delete
                                                                transaction
                                                            </span>
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function CategoryList({
    categories,
    description,
    onDelete,
    onEdit,
    title,
}: {
    categories: Category[];
    description: string;
    onDelete: (id: string) => void;
    onEdit: (category: Category) => void;
    title: string;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <p className="text-sm leading-5 text-muted-foreground">
                    {description}
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {categories.length === 0 && (
                    <EmptyState
                        title="No categories yet"
                        description="Create categories to organize your transactions."
                    />
                )}
                {categories.map((category) => (
                    <div
                        key={category.id}
                        className="flex items-center justify-between gap-3 rounded-md border bg-white p-3"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <CategoryIconBadge category={category} />
                            <span className="truncate text-sm font-medium leading-5">
                                {category.name}
                            </span>
                        </div>
                        <div className="flex gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(category)}
                            >
                                <Edit3 className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Edit category</span>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(category.id)}
                            >
                                <Trash2 className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Delete category</span>
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

function DatePickerInput({
    ariaLabel,
    displayTodayLabel = false,
    id,
    onChange,
    popoverAlign = "left",
    value,
}: {
    ariaLabel?: string;
    displayTodayLabel?: boolean;
    id?: string;
    onChange: (value: string) => void;
    popoverAlign?: "left" | "right";
    value: string;
}) {
    const selectedDate = parseDateValue(value);
    const selectedLabel =
        displayTodayLabel && isSameDay(selectedDate, new Date())
            ? "Today"
            : formatPickerDate(selectedDate);
    const selectedYear = selectedDate.getFullYear();
    const selectedMonthIndex = selectedDate.getMonth();
    const [isOpen, setIsOpen] = useState(false);
    const [popoverSide, setPopoverSide] = useState<"above" | "below">("below");
    const [visibleMonth, setVisibleMonth] = useState(
        new Date(selectedYear, selectedMonthIndex, 1),
    );
    const pickerRef = useRef<HTMLDivElement>(null);
    const days = getCalendarDays(visibleMonth);

    useEffect(() => {
        setVisibleMonth(new Date(selectedYear, selectedMonthIndex, 1));
    }, [selectedMonthIndex, selectedYear]);

    useEffect(() => {
        if (isOpen) {
            setPopoverSide(getPopoverSide(pickerRef.current, 390));
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handlePointerDown(event: PointerEvent) {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={pickerRef}>
            <button
                aria-label={ariaLabel}
                id={id}
                className={cn(
                    "flex h-10 w-full cursor-pointer items-center gap-3 rounded-md border border-input bg-white px-3 py-2 text-left text-base text-foreground transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-[#2563EB] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.18)] sm:text-sm",
                    isOpen &&
                        "border-[#2563EB] shadow-[0_0_0_3px_rgba(37,99,235,0.18)]",
                )}
                type="button"
                onClick={() => {
                    setPopoverSide(getPopoverSide(pickerRef.current, 390));
                    setIsOpen((open) => !open);
                }}
            >
                <Calendar
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                />
                <span>{selectedLabel}</span>
            </button>

            {isOpen && (
                <div
                    className={cn(
                        "absolute z-[70] w-full min-w-[312px] rounded-2xl border border-border bg-white p-4 shadow-[0_18px_60px_rgba(0,0,0,0.12)]",
                        popoverAlign === "right" ? "right-0" : "left-0",
                        popoverSide === "above"
                            ? "bottom-full mb-2"
                            : "top-full mt-2",
                    )}
                >
                    <div className="mb-4 flex items-center justify-between">
                        <p className="text-base font-medium leading-6">
                            {visibleMonth.toLocaleDateString("en-US", {
                                month: "long",
                                year: "numeric",
                            })}
                        </p>
                        <div className="flex gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    setVisibleMonth(
                                        new Date(
                                            visibleMonth.getFullYear(),
                                            visibleMonth.getMonth() - 1,
                                            1,
                                        ),
                                    )
                                }
                            >
                                <ChevronLeft className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Previous month</span>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    setVisibleMonth(
                                        new Date(
                                            visibleMonth.getFullYear(),
                                            visibleMonth.getMonth() + 1,
                                            1,
                                        ),
                                    )
                                }
                            >
                                <ChevronRight className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Next month</span>
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                        {["S", "M", "T", "W", "T", "F", "S"].map(
                            (day, index) => (
                                <div
                                    className="flex h-8 items-center justify-center text-muted-foreground"
                                    key={`${day}-${index}`}
                                >
                                    {day}
                                </div>
                            ),
                        )}
                        {days.map((day) => {
                            const isCurrentMonth =
                                day.getMonth() === visibleMonth.getMonth();
                            const isSelected = isSameDay(day, selectedDate);

                            return (
                                <button
                                    className={cn(
                                        "flex h-9 items-center justify-center rounded-md text-sm transition-colors md:hover:bg-[#F2F2F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        !isCurrentMonth &&
                                            "text-muted-foreground/60",
                                        isSelected &&
                                            "bg-[#2563EB] text-white md:hover:bg-[#2563EB]",
                                    )}
                                    key={day.toISOString()}
                                    type="button"
                                    onClick={() => {
                                        onChange(toDateInputValue(day));
                                        setIsOpen(false);
                                    }}
                                >
                                    {day.getDate()}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function MonthPickerInput({
    ariaLabel,
    compact = false,
    id,
    onChange,
    value,
}: {
    ariaLabel?: string;
    compact?: boolean;
    id?: string;
    onChange: (value: string) => void;
    value: string;
}) {
    const selectedMonth = parseMonthValue(value);
    const selectedMonthYear = selectedMonth.getFullYear();
    const [isOpen, setIsOpen] = useState(false);
    const [popoverSide, setPopoverSide] = useState<"above" | "below">("below");
    const [visibleYear, setVisibleYear] = useState(selectedMonthYear);
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setVisibleYear(selectedMonthYear);
    }, [selectedMonthYear]);

    useEffect(() => {
        if (isOpen) {
            setPopoverSide(getPopoverSide(pickerRef.current, 250));
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handlePointerDown(event: PointerEvent) {
            if (
                pickerRef.current &&
                !pickerRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
        };
    }, [isOpen]);

    return (
        <div className="relative" ref={pickerRef}>
            <button
                aria-label={ariaLabel}
                id={id}
                className={cn(
                    "flex h-10 w-full cursor-pointer items-center gap-3 rounded-md border border-input bg-white px-3 py-2 text-left text-base text-foreground transition-[border-color,box-shadow] duration-150 ease-out focus-visible:border-[#2563EB] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(37,99,235,0.18)] sm:text-sm",
                    compact &&
                        "inline-flex w-auto rounded-full border-transparent bg-[#E8F0FE] px-3 py-1 text-xs font-medium leading-4 text-[#0B57D0] md:hover:bg-[#DCE8FD] sm:text-xs",
                    isOpen &&
                        (compact
                            ? "border-[#2563EB] bg-[#E8F0FE] shadow-[0_0_0_3px_rgba(37,99,235,0.18)]"
                            : "border-[#2563EB] shadow-[0_0_0_3px_rgba(37,99,235,0.18)]"),
                )}
                type="button"
                onClick={() => {
                    setPopoverSide(getPopoverSide(pickerRef.current, 250));
                    setIsOpen((open) => !open);
                }}
            >
                <Calendar
                    className={cn(
                        "h-4 w-4 shrink-0",
                        compact ? "text-[#0B57D0]" : "text-muted-foreground",
                    )}
                    aria-hidden
                />
                <span>
                    {selectedMonth.toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                    })}
                </span>
            </button>

            {isOpen && (
                <div
                    className={cn(
                        "absolute left-0 z-[70] w-full min-w-[312px] rounded-2xl border border-border bg-white p-4 shadow-[0_18px_60px_rgba(0,0,0,0.12)]",
                        popoverSide === "above"
                            ? "bottom-full mb-2"
                            : "top-full mt-2",
                    )}
                >
                    <div className="mb-4 flex items-center justify-between">
                        <p className="text-base font-medium leading-6">
                            {visibleYear}
                        </p>
                        <div className="flex gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    setVisibleYear((year) => year - 1)
                                }
                            >
                                <ChevronLeft className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Previous year</span>
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    setVisibleYear((year) => year + 1)
                                }
                            >
                                <ChevronRight className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Next year</span>
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: 12 }, (_, monthIndex) => {
                            const monthDate = new Date(
                                visibleYear,
                                monthIndex,
                                1,
                            );
                            const isSelected =
                                selectedMonth.getFullYear() === visibleYear &&
                                selectedMonth.getMonth() === monthIndex;

                            return (
                                <button
                                    className={cn(
                                        "h-10 rounded-md text-sm transition-colors md:hover:bg-[#F2F2F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        isSelected &&
                                            "bg-[#2563EB] text-white md:hover:bg-[#2563EB]",
                                    )}
                                    key={monthDate.toISOString()}
                                    type="button"
                                    onClick={() => {
                                        onChange(toMonthInputValue(monthDate));
                                        setIsOpen(false);
                                    }}
                                >
                                    {monthDate.toLocaleDateString("en-US", {
                                        month: "short",
                                    })}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function getPopoverSide(element: HTMLElement | null, estimatedHeight: number) {
    if (!element) {
        return "below";
    }

    const rect = element.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    return spaceBelow < estimatedHeight && spaceAbove > spaceBelow
        ? "above"
        : "below";
}

function parseDateValue(value: string) {
    if (!value) {
        return new Date();
    }

    const [year, month, day] = value.split("-").map(Number);

    if (!year || !month || !day) {
        return new Date();
    }

    return new Date(year, month - 1, day);
}

function parseMonthValue(value: string) {
    if (!value) {
        return new Date();
    }

    const [year, month] = value.split("-").map(Number);

    if (!year || !month) {
        return new Date();
    }

    return new Date(year, month - 1, 1);
}

function toDateInputValue(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function toMonthInputValue(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
}

function formatPickerDate(date: Date) {
    return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function isSameDay(left: Date, right: Date) {
    return (
        left.getFullYear() === right.getFullYear() &&
        left.getMonth() === right.getMonth() &&
        left.getDate() === right.getDate()
    );
}

function getCalendarDays(month: Date) {
    const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(firstOfMonth);
    start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
    });
}

function EditModal({
    children,
    onClose,
}: {
    children: React.ReactNode;
    onClose: () => void;
}) {
    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 pb-6 pt-4 sm:items-center sm:py-6">
            <button
                aria-label="Close modal"
                className="absolute inset-0 cursor-default bg-white/45 backdrop-blur-sm"
                type="button"
                onClick={onClose}
            />
            <div
                className="relative w-full max-w-[540px] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
                role="dialog"
                aria-modal="true"
            >
                {children}
            </div>
        </div>
    );
}

function MetricCard({
    className,
    icon,
    label,
    value,
}: {
    className?: string;
    icon: "minus" | "plus" | "wallet";
    label: string;
    value: string;
}) {
    return (
        <Card className={cn("bg-white p-3 md:p-4", className)}>
            <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100">
                {icon === "plus" && <Plus className="h-4 w-4" aria-hidden />}
                {icon === "minus" && <Minus className="h-4 w-4" aria-hidden />}
                {icon === "wallet" && (
                    <CircleDollarSign className="h-4 w-4" aria-hidden />
                )}
            </div>
            <p className="text-sm leading-5 text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-medium leading-6 md:text-xl md:leading-7">
                {value}
            </p>
        </Card>
    );
}

function CategoryIconBadge({ category }: { category: Category }) {
    const Icon = categoryIconMap.get(category.icon) ?? Receipt;

    return (
        <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-white"
            style={{ color: category.color }}
        >
            <Icon className="h-4 w-4" aria-hidden />
        </span>
    );
}

function TransactionIcon({
    category,
    type,
}: {
    category?: Category;
    type: TransactionType;
}) {
    if (category) {
        return <CategoryIconBadge category={category} />;
    }

    return (
        <span
            className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                type === "income"
                    ? "bg-[#DCFCE7] text-[#15803D]"
                    : "bg-[#FEE2E2] text-[#DC2626]",
            )}
        >
            {type === "income" ? (
                <Plus className="h-4 w-4" aria-hidden />
            ) : (
                <Minus className="h-4 w-4" aria-hidden />
            )}
        </span>
    );
}

function ProfileImage({
    size = "md",
    user,
}: {
    size?: "xs" | "sm" | "md" | "lg";
    user: User | null;
}) {
    const avatarUrl =
        typeof user?.user_metadata.avatar_url === "string"
            ? user.user_metadata.avatar_url
            : null;
    const sizeClass =
        size === "xs"
            ? "h-5 w-5"
            : size === "sm"
              ? "h-8 w-8"
              : size === "lg"
                ? "h-12 w-12"
                : "h-10 w-10";
    const pixelSize =
        size === "xs" ? 20 : size === "sm" ? 32 : size === "lg" ? 48 : 40;

    if (avatarUrl) {
        return (
            <Image
                alt=""
                className={cn(
                    sizeClass,
                    "shrink-0 rounded-full border border-border object-cover",
                )}
                height={pixelSize}
                src={avatarUrl}
                width={pixelSize}
            />
        );
    }

    return (
        <span
            className={cn(
                sizeClass,
                "flex shrink-0 items-center justify-center rounded-full border border-border bg-neutral-100 font-medium text-muted-foreground",
            )}
        >
            {getAccountInitial(user)}
        </span>
    );
}

function getAccountName(user: User | null) {
    const metadataName =
        typeof user?.user_metadata.full_name === "string"
            ? user.user_metadata.full_name
            : typeof user?.user_metadata.name === "string"
              ? user.user_metadata.name
              : null;

    if (metadataName?.trim()) {
        return metadataName.trim();
    }

    return user?.email?.split("@")[0] ?? "Account";
}

function getAccountInitial(user: User | null) {
    return getAccountName(user).charAt(0).toUpperCase();
}

function GoogleLogo({ className }: { className?: string }) {
    return (
        <svg
            aria-hidden
            className={className}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
                fill="#EA4335"
            />
        </svg>
    );
}

function EmptyState({
    className,
    description,
    title,
}: {
    className?: string;
    description: string;
    title: string;
}) {
    return (
        <div
            className={cn(
                "w-full rounded-md border border-dashed bg-white px-4 py-10 text-center",
                className,
            )}
        >
            <p className="text-sm font-medium leading-5">{title}</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {description}
            </p>
        </div>
    );
}

function FieldError({
    children,
    message,
}: {
    children: React.ReactNode;
    message?: string;
}) {
    return (
        <div className="space-y-2">
            {children}
            {message && (
                <p className="text-sm leading-5 text-destructive">{message}</p>
            )}
        </div>
    );
}
