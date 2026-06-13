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
    DashboardView,
} from "@/components/kwarta/dashboard-view";
import {
    HomeView,
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
    withMissingDefaultCategories,
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
    ProfileImage,
    TransactionIcon,
    categoryIconChoices,
    colorChoices,
    getAccountName,
} from "@/components/kwarta/shared";
import { BudgetProgressList } from "@/components/kwarta/budget-progress-list";
import { BudgetsView } from "@/components/kwarta/budgets-view";
import { CategoryForm } from "@/components/kwarta/categories";

type View = "dashboard" | "transactions" | "budgets" | "reports";

type StoredWorkspace = {
    budgets: Budget[];
    categories: Category[];
    transactions: Transaction[];
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

            <div className="mx-auto w-full max-w-7xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 md:px-5 md:py-7">
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

