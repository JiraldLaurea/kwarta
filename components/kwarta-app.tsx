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
    LayoutGrid,
    List,
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
import type { RefObject } from "react";
import { useForm } from "react-hook-form";
import type { IconType } from "react-icons";
import {
    IoBarChart,
    IoBarChartOutline,
    IoHome,
    IoHomeOutline,
    IoReceipt,
    IoReceiptOutline,
    IoSettings,
    IoSettingsOutline,
    IoWallet,
    IoWalletOutline,
} from "react-icons/io5";
import {
    DashboardView,
} from "@/components/kwarta/dashboard-view";
import {
    type HomeItemStyle,
    HomeView,
    ManageCategoriesView,
    QuickTransactionModal,
} from "@/components/kwarta/home-view";
import {
    TransactionForm,
    TransactionTable,
} from "@/components/kwarta/transactions";
import { TransactionsView } from "@/components/kwarta/transactions-view";
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
import {
    downloadBackupFile,
    parseBudgetBackupPayload,
    parseTransactionBackupPayload,
    type TransactionImportResult,
} from "@/lib/kwarta/backup";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
    AuthMode,
    Budget,
    Category,
    Transaction,
    TransactionType,
} from "@/lib/types";
import { cn, formatCurrency, formatDate, percent } from "@/lib/utils";
import {
    formatMonthLabel,
    formatPickerDate,
    formatTime,
    formatTransactionGroupDate,
    getAverageExpenseDayCount,
    getCalendarDays,
    getCurrentTimeInputValue,
    getDefaultCategoryIcon,
    getDefaultTransactionDate,
    getFirstCategoryId,
    getSubcategoriesForCategory,
    getTransactionFormValues,
    getTransactionGroupSummary,
    getUniqueCategoryId,
    handleDecimalInput,
    isInMonth,
    isSameDay,
    normalizeTimeValue,
    normalizeTransactionType,
    parseDateValue,
    parseDecimalInput,
    parseMonthValue,
    reorderCategoriesByType,
    slugifyCategoryValue,
    toDateInputValue,
    toMonthInputValue,
    upsertReusableBudgets,
    withCategoryIcons,
} from "@/lib/kwarta/helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import {
    CategoryIconBadge,
    DatePickerInput,
    EditModal,
    EmptyState,
    FieldError,
    GoogleLogo,
    MetricCard,
    ModalBackButton,
    MonthPickerInput,
    PageHeader,
    ProfileImage,
    TransactionIcon,
    categoryIconChoices,
    colorChoices,
    getAccountName,
} from "@/components/kwarta/shared";
import { BudgetProgressList } from "@/components/kwarta/budget-progress-list";
import { BudgetsView } from "@/components/kwarta/budgets-view";
import { CategoryForm } from "@/components/kwarta/categories";
import {
    ImportConfirmationModal,
    ImportLoadingModal,
    TransactionBackupActions,
} from "@/components/kwarta/backup-controls";

type View =
    | "dashboard"
    | "transactions"
    | "budgets"
    | "reports"
    | "settings"
    | "manage-categories";

type StoredWorkspace = {
    budgets: Budget[];
    categories: Category[];
    transactions: Transaction[];
};

type PendingBackupImport =
    | {
          itemLabel: "transactions";
          result: TransactionImportResult;
      }
    | {
          budgets: Budget[];
          itemLabel: "budgets";
      };

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
    const [view, setView] = useState<View>("dashboard");
    const [homeItemStyle, setHomeItemStyle] =
        useState<HomeItemStyle>("ios");
    const [budgetsEnabled, setBudgetsEnabled] = useState(true);
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
    const [categoryPendingDelete, setCategoryPendingDelete] =
        useState<Category | null>(null);
    const transactionImportInputRef = useRef<HTMLInputElement>(null);
    const budgetImportInputRef = useRef<HTMLInputElement>(null);
    const [transactionImportError, setTransactionImportError] = useState<
        string | null
    >(null);
    const [budgetImportError, setBudgetImportError] = useState<string | null>(
        null,
    );
    const [isImportingBackup, setIsImportingBackup] =
        useState<"transactions" | "budgets" | null>(null);
    const [pendingBackupImport, setPendingBackupImport] =
        useState<PendingBackupImport | null>(null);
    const supabase = useMemo(() => createSupabaseBrowserClient(), []);

    const userId = user?.id ?? null;

    useEffect(() => {
        const storedHomeItemStyle = window.localStorage.getItem(
            "kwarta:home-item-style",
        );

        if (
            storedHomeItemStyle === "ios" ||
            storedHomeItemStyle === "cards"
        ) {
            setHomeItemStyle(storedHomeItemStyle);
        }

        const storedBudgetsEnabled = window.localStorage.getItem(
            "kwarta:budgets-enabled",
        );

        if (storedBudgetsEnabled === "true" || storedBudgetsEnabled === "false") {
            setBudgetsEnabled(storedBudgetsEnabled === "true");
        }

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
        window.localStorage.setItem("kwarta:home-item-style", homeItemStyle);
    }, [homeItemStyle]);

    useEffect(() => {
        window.localStorage.setItem(
            "kwarta:budgets-enabled",
            String(budgetsEnabled),
        );
    }, [budgetsEnabled]);

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

                setCategories(withCategoryIcons(workspace.categories));
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

    async function applyTransactionImport(result: TransactionImportResult) {
        setCategories(result.categories);
        setTransactions(result.transactions);
        setEditingTransactionId(null);
        setTransactionImportError(null);
    }

    async function applyBudgetImport(nextBudgets: Budget[]) {
        setBudgets(nextBudgets);
        setEditingBudgetId(null);
        setBudgetImportError(null);
    }

    async function handleTransactionImportFile(file: File) {
        setIsImportingBackup("transactions");
        let nextImport: TransactionImportResult;

        try {
            nextImport = parseTransactionBackupPayload(
                JSON.parse(await file.text()),
                categories,
            );
        } catch {
            setTransactionImportError(
                "Transactions could not be imported. Check that this is a Kwarta transactions JSON backup.",
            );
            setIsImportingBackup(null);
            return;
        }

        if (transactions.length > 0) {
            setPendingBackupImport({
                itemLabel: "transactions",
                result: nextImport,
            });
            setIsImportingBackup(null);
            return;
        }

        await applyTransactionImport(nextImport);
        setIsImportingBackup(null);
    }

    async function handleBudgetImportFile(file: File) {
        setIsImportingBackup("budgets");
        let nextBudgets: Budget[];

        try {
            nextBudgets = parseBudgetBackupPayload(
                JSON.parse(await file.text()),
                categories,
            );
        } catch {
            setBudgetImportError(
                "Budgets could not be imported. Check that this is a Kwarta budgets JSON backup.",
            );
            setIsImportingBackup(null);
            return;
        }

        if (budgets.length > 0) {
            setPendingBackupImport({
                budgets: nextBudgets,
                itemLabel: "budgets",
            });
            setIsImportingBackup(null);
            return;
        }

        await applyBudgetImport(nextBudgets);
        setIsImportingBackup(null);
    }

    async function confirmBackupImport() {
        if (!pendingBackupImport) {
            return;
        }

        const nextImport = pendingBackupImport;
        setPendingBackupImport(null);
        setIsImportingBackup(nextImport.itemLabel);

        if (nextImport.itemLabel === "transactions") {
            await applyTransactionImport(nextImport.result);
        } else {
            await applyBudgetImport(nextImport.budgets);
        }

        setIsImportingBackup(null);
    }

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
            <header className="sticky top-0 z-30 border-b bg-white [backface-visibility:hidden] [transform:translateZ(0)]">
                <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-5 md:py-4">
                    <div className="w-[180px]">
                        <MonthPickerInput
                            ariaLabel="Select month"
                            value={selectedMonth}
                            onChange={setSelectedMonth}
                        />
                    </div>

                    <nav className="hidden items-center gap-2 md:flex">
                        <NavItems
                            activeView={view}
                            onSelect={setView}
                        />
                    </nav>
                </div>
            </header>

            <div className="mx-auto w-full max-w-7xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 md:px-5 md:py-7">
                {view === "dashboard" && (
                    <HomeView
                        budgets={monthBudgets}
                        budgetsEnabled={budgetsEnabled}
                        expenseCategories={expenseCategories}
                        homeItemStyle={homeItemStyle}
                        incomeCategories={incomeCategories}
                        onDeleteCategory={setCategoryPendingDelete}
                        onEditCategory={(category) =>
                            setEditingCategoryId(category.id)
                        }
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
                        onSubmit={(values) => {
                            if (editingTransactionId) {
                                setTransactions((current) =>
                                    current.map((transaction) =>
                                        transaction.id === editingTransactionId
                                            ? {
                                                  ...transaction,
                                                  ...values,
                                                  note: values.note || "",
                                                  time: normalizeTimeValue(
                                                      values.time,
                                                  ),
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
                                    time:
                                        values.time === "00:00"
                                            ? getCurrentTimeInputValue()
                                            : normalizeTimeValue(values.time),
                                },
                                ...current,
                            ]);
                        }}
                        transactions={monthTransactions}
                    />
                )}

                {view === "budgets" && (
                    <BudgetsView
                        allBudgets={budgets}
                        budgets={monthBudgets}
                        budgetsEnabled={budgetsEnabled}
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
                        onSubmit={(values) => {
                            if (editingBudgetId) {
                                setBudgets((current) =>
                                    upsertReusableBudgets(
                                        current,
                                        values,
                                        editingBudgetId,
                                    ),
                                );
                                setEditingBudgetId(null);
                                return;
                            }

                            setBudgets((current) =>
                                upsertReusableBudgets(current, values),
                            );
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
                            budgetsEnabled={budgetsEnabled}
                            categories={categories}
                            cashflowData={cashflowData}
                            spendingByCategory={spendingByCategory}
                            transactions={monthTransactions}
                        />
                    </div>
                )}

                {view === "settings" && (
                    <SettingsView
                        accountName={accountName}
                        email={user?.email ?? "Account session"}
                        budgetsEnabled={budgetsEnabled}
                        budgetImportError={budgetImportError}
                        homeItemStyle={homeItemStyle}
                        budgetImportInputRef={budgetImportInputRef}
                        transactionImportError={transactionImportError}
                        transactionImportInputRef={transactionImportInputRef}
                        user={user}
                        onManageCategories={() => setView("manage-categories")}
                        onBudgetsEnabledChange={setBudgetsEnabled}
                        onBudgetExport={() =>
                            downloadBackupFile("budgets", budgets, categories)
                        }
                        onBudgetImportClick={() =>
                            budgetImportInputRef.current?.click()
                        }
                        onBudgetImportFile={handleBudgetImportFile}
                        onHomeItemStyleChange={setHomeItemStyle}
                        onSignOut={async () => {
                            await supabase?.auth.signOut();
                            setUser(null);
                            setIsAuthed(false);
                        }}
                        onTransactionExport={() =>
                            downloadBackupFile(
                                "transactions",
                                transactions,
                                categories,
                            )
                        }
                        onTransactionImportClick={() =>
                            transactionImportInputRef.current?.click()
                        }
                        onTransactionImportFile={handleTransactionImportFile}
                    />
                )}

                {view === "manage-categories" && (
                    <ManageCategoriesView
                        expenseCategories={expenseCategories}
                        incomeCategories={incomeCategories}
                        onAddCategory={() => setHomeCategoryFormOpen(true)}
                        onBack={() => setView("settings")}
                        onEditCategory={(category) =>
                            setEditingCategoryId(category.id)
                        }
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
                    />
                )}
            </div>
            {quickAddCategory && (
                <QuickTransactionModal
                    budget={monthBudgets.find(
                        (budget) => budget.categoryId === quickAddCategory.id,
                    )}
                    budgetsEnabled={budgetsEnabled}
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
                    onSetReusableBudget={(limit) => {
                        setBudgets((current) =>
                            upsertReusableBudgets(current, {
                                categoryId: quickAddCategory.id,
                                limit,
                                month: selectedMonth,
                                reuseBudget: true,
                            }),
                        );
                        setQuickAddCategory(null);
                    }}
                    onSubmit={({ amount, date, subcategory }) => {
                        setTransactions((current) => [
                            {
                                id: crypto.randomUUID(),
                                amount,
                                categoryId: quickAddCategory.id,
                                date,
                                subcategory: subcategory,
                                note: "",
                                time: getCurrentTimeInputValue(),
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
            {editingCategoryId &&
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
                            onDelete={() => {
                                const categoryId = editingCategoryId;

                                setCategories((current) =>
                                    current.filter(
                                        (category) =>
                                            category.id !== categoryId,
                                    ),
                                );
                                setTransactions((current) =>
                                    current.filter(
                                        (transaction) =>
                                            transaction.categoryId !==
                                            categoryId,
                                    ),
                                );
                                setBudgets((current) =>
                                    current.filter(
                                        (budget) =>
                                            budget.categoryId !== categoryId,
                                    ),
                                );
                                setEditingCategoryId(null);
                            }}
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
            {pendingBackupImport && (
                <ImportConfirmationModal
                    count={
                        pendingBackupImport.itemLabel === "transactions"
                            ? pendingBackupImport.result.transactions.length
                            : pendingBackupImport.budgets.length
                    }
                    itemLabel={pendingBackupImport.itemLabel}
                    onCancel={() => setPendingBackupImport(null)}
                    onConfirm={confirmBackupImport}
                />
            )}
            {isImportingBackup && (
                <ImportLoadingModal itemLabel={isImportingBackup} />
            )}
            <MobileTabBar
                activeView={view}
                onSelect={setView}
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
    const currentNavView =
        activeView === "manage-categories" ? "settings" : activeView;
    const items: Array<{ label: string; view: View }> = [
        { label: "Home", view: "dashboard" },
        { label: "Transactions", view: "transactions" },
        { label: "Budgets", view: "budgets" },
        { label: "Reports", view: "reports" },
        { label: "Settings", view: "settings" },
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
                    variant={
                        currentNavView === item.view ? "default" : "secondary"
                    }
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
    onSelect,
}: {
    activeView: View;
    onSelect: (view: View) => void;
}) {
    const currentNavView =
        activeView === "manage-categories" ? "settings" : activeView;
    const items: Array<{
        icon: IconType;
        activeIcon: IconType;
        label: string;
        view: View;
    }> = [
        {
            icon: IoHomeOutline,
            activeIcon: IoHome,
            label: "Home",
            view: "dashboard",
        },
        {
            icon: IoReceiptOutline,
            activeIcon: IoReceipt,
            label: "Transactions",
            view: "transactions",
        },
        {
            icon: IoWalletOutline,
            activeIcon: IoWallet,
            label: "Budgets",
            view: "budgets",
        },
        {
            icon: IoBarChartOutline,
            activeIcon: IoBarChart,
            label: "Reports",
            view: "reports",
        },
        {
            icon: IoSettingsOutline,
            activeIcon: IoSettings,
            label: "Settings",
            view: "settings",
        },
    ];

    return (
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] backdrop-blur-md md:hidden">
            <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
                {items.map((item) => {
                    const active = currentNavView === item.view;
                    const Icon = active ? item.activeIcon : item.icon;

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
                            <Icon className="h-6 w-6" aria-hidden />
                            <span className="max-w-full truncate">
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}

function SettingsView({
    accountName,
    budgetImportError,
    budgetImportInputRef,
    budgetsEnabled,
    email,
    homeItemStyle,
    transactionImportError,
    transactionImportInputRef,
    user,
    onBudgetExport,
    onBudgetImportClick,
    onBudgetImportFile,
    onBudgetsEnabledChange,
    onHomeItemStyleChange,
    onManageCategories,
    onSignOut,
    onTransactionExport,
    onTransactionImportClick,
    onTransactionImportFile,
}: {
    accountName: string;
    budgetImportError: string | null;
    budgetImportInputRef: RefObject<HTMLInputElement>;
    budgetsEnabled: boolean;
    email: string;
    homeItemStyle: HomeItemStyle;
    transactionImportError: string | null;
    transactionImportInputRef: RefObject<HTMLInputElement>;
    user: User | null;
    onBudgetExport: () => void;
    onBudgetImportClick: () => void;
    onBudgetImportFile: (file: File) => void;
    onBudgetsEnabledChange: (enabled: boolean) => void;
    onHomeItemStyleChange: (style: HomeItemStyle) => void;
    onManageCategories: () => void;
    onSignOut: () => void;
    onTransactionExport: () => void;
    onTransactionImportClick: () => void;
    onTransactionImportFile: (file: File) => void;
}) {
    const options: Array<{
        description: string;
        icon: LucideIcon;
        label: string;
        value: HomeItemStyle;
    }> = [
        {
            description: "Grouped rows",
            icon: List,
            label: "List",
            value: "ios",
        },
        {
            description: "Compact cards",
            icon: LayoutGrid,
            label: "Cards",
            value: "cards",
        },
    ];

    return (
        <div className="w-full space-y-5">
            <PageHeader
                title="Settings"
                description="Manage app preferences, budget behavior, and account access."
            />

            <div className="grid gap-4 md:gap-5 lg:grid-cols-2">
                <Card className="overflow-hidden bg-white">
                    <CardHeader>
                        <CardTitle>General</CardTitle>
                        <p className="text-sm leading-5 text-muted-foreground">
                            Control core app behavior and visibility.
                        </p>
                    </CardHeader>
                    <CardContent>
                        <SettingsSwitch
                            checked={!budgetsEnabled}
                            description="Add expenses without setting category budgets."
                            id="disable-budget-tracking"
                            label="Disable Budget Tracking"
                            onChange={(checked) =>
                                onBudgetsEnabledChange(!checked)
                            }
                        />
                        <div className="mt-5 border-t border-border pt-5">
                            <Button
                                className="w-full justify-between"
                                type="button"
                                variant="secondary"
                                onClick={onManageCategories}
                            >
                                <span>Manage categories</span>
                                <ChevronRight
                                    className="h-4 w-4"
                                    aria-hidden
                                />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden bg-white">
                    <CardHeader>
                        <CardTitle>Home layout</CardTitle>
                        <p className="text-sm leading-5 text-muted-foreground">
                            Choose how category items appear on the Home page.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {options.map((option) => {
                            const Icon = option.icon;
                            const selected = homeItemStyle === option.value;

                            return (
                                <button
                                    key={option.value}
                                    className={cn(
                                        "flex min-h-[70px] w-full items-center gap-3 rounded-md border border-border px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hover:bg-neutral-50",
                                        selected &&
                                            "border-primary bg-neutral-50",
                                    )}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() =>
                                        onHomeItemStyleChange(option.value)
                                    }
                                >
                                    <span
                                        className={cn(
                                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-white text-muted-foreground",
                                            selected && "text-primary",
                                        )}
                                    >
                                        <Icon
                                            className="h-5 w-5"
                                            aria-hidden
                                        />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-medium leading-5">
                                            {option.label}
                                        </span>
                                        <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                                            {option.description}
                                        </span>
                                    </span>
                                    {selected && (
                                        <Check
                                            className="h-5 w-5 shrink-0 text-primary"
                                            aria-hidden
                                        />
                                    )}
                                </button>
                            );
                        })}
                    </CardContent>
                </Card>

                <Card className="overflow-hidden bg-white">
                    <CardHeader>
                        <CardTitle>Backup</CardTitle>
                        <p className="text-sm leading-5 text-muted-foreground">
                            Import or export your Kwarta data as JSON backups.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <BackupActionRow
                            description="Posted income and expense entries."
                            error={transactionImportError}
                            importInputRef={transactionImportInputRef}
                            label="Transactions"
                            onExport={onTransactionExport}
                            onImportClick={onTransactionImportClick}
                            onImportFile={onTransactionImportFile}
                        />
                        <BackupActionRow
                            description="Monthly category spending limits."
                            error={budgetImportError}
                            importInputRef={budgetImportInputRef}
                            label="Budgets"
                            onExport={onBudgetExport}
                            onImportClick={onBudgetImportClick}
                            onImportFile={onBudgetImportFile}
                        />
                    </CardContent>
                </Card>

                <Card className="overflow-hidden bg-white">
                    <CardHeader>
                        <CardTitle>Account</CardTitle>
                        <p className="text-sm leading-5 text-muted-foreground">
                            Review your signed-in profile and session access.
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="flex items-center gap-3 rounded-md border border-border bg-neutral-50 p-3">
                            <LogoMark size={40} />
                            <div>
                                <p className="font-medium leading-5">Kwarta</p>
                                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                                    Personal budget workspace
                                </p>
                            </div>
                        </div>
                        <div className="flex min-w-0 items-center gap-3">
                            <ProfileImage user={user} size="md" />
                            <div className="min-w-0">
                                <p className="truncate font-medium leading-5">
                                    {accountName}
                                </p>
                                <p className="mt-1 truncate text-sm leading-5 text-muted-foreground">
                                    {email}
                                </p>
                            </div>
                        </div>
                        <Button
                            className="w-full justify-between"
                            type="button"
                            variant="secondary"
                            onClick={onSignOut}
                        >
                            <span>Log Out</span>
                            <LogOut className="h-4 w-4" aria-hidden />
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function SettingsSwitch({
    checked,
    description,
    id,
    label,
    onChange,
}: {
    checked: boolean;
    description: string;
    id: string;
    label: string;
    onChange: (checked: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-6">
            <div>
                <Label htmlFor={id}>{label}</Label>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {description}
                </p>
            </div>
            <button
                aria-checked={checked}
                className={cn(
                    "relative inline-block h-6 w-10 shrink-0 cursor-pointer rounded-full transition-[background,border-color] duration-150 ease-[cubic-bezier(0,0,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D99FF]/30",
                    checked ? "bg-[#007AFF]" : "bg-neutral-300",
                )}
                id={id}
                role="switch"
                type="button"
                onClick={() => onChange(!checked)}
            >
                <span
                    className={cn(
                        "pointer-events-none absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.22)] transition-[left] duration-150 ease-[cubic-bezier(0,0,0.2,1)]",
                        checked && "left-[18px]",
                    )}
                />
            </button>
        </div>
    );
}

function BackupActionRow({
    description,
    error,
    importInputRef,
    label,
    onExport,
    onImportClick,
    onImportFile,
}: {
    description: string;
    error: string | null;
    importInputRef: RefObject<HTMLInputElement>;
    label: string;
    onExport: () => void;
    onImportClick: () => void;
    onImportFile: (file: File) => void;
}) {
    return (
        <div className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <p className="text-sm font-medium leading-5">{label}</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {description}
                </p>
            </div>
            <TransactionBackupActions
                error={error}
                importInputRef={importInputRef}
                onExport={onExport}
                onImportClick={onImportClick}
                onImportFile={onImportFile}
            />
        </div>
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
            <Card className="min-h-dvh rounded-none border-0 bg-white sm:min-h-0 sm:overflow-hidden sm:rounded-2xl sm:border">
                <div className="px-6 pb-6 pt-5">
                    <ModalBackButton onClick={onCancel} />
                    <CardTitle className="text-2xl font-medium leading-8">
                        Delete {category.name}?
                    </CardTitle>
                    <p className="mt-2 text-base leading-6 text-muted-foreground">
                        This will remove the card, its transactions, and any
                        budgets linked to this category.
                    </p>
                    <Button
                        className="mt-6 w-full sm:hidden"
                        type="button"
                        onClick={onConfirm}
                    >
                        Delete card
                    </Button>
                </div>
                <div className="hidden items-center justify-between border-t border-border bg-neutral-50 px-5 py-4 sm:flex">
                    <Button
                        data-modal-close
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

