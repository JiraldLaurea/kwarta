"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";
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
  ChevronRight,
  CircleDollarSign,
  Info,
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { useForm } from "react-hook-form";
import type { IconType } from "react-icons";
import { RemoveScroll } from "react-remove-scroll";
import {
  IoHome,
  IoHomeOutline,
  IoPieChart,
  IoPieChartOutline,
  IoPricetagsOutline,
  IoReceipt,
  IoReceiptOutline,
  IoSettings,
  IoSettingsOutline,
  IoStatsChart,
  IoStatsChartOutline,
  IoWallet,
  IoWalletOutline,
} from "react-icons/io5";
import { DashboardView } from "@/components/kwarta/dashboard-view";
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
  accounts as seedAccounts,
  budgets as seedBudgets,
  categories as seedCategories,
  transactions as seedTransactions,
  transfers as seedTransfers,
} from "@/lib/data";
import {
  authSchema,
  budgetSchema,
  categorySchema,
  transactionSchema,
  type AuthFormValues,
  type BudgetFormValues,
  type CategoryFormValues,
  type SubcategoryFormValues,
  type TransactionFormValues,
  type AccountFormValues,
  type TransferFormValues,
} from "@/lib/schema";
import {
  createWorkspaceBackupPayload,
  downloadWorkspaceBackupPayload,
  downloadWorkspaceBackupFile,
  parseWorkspaceBackupPayload,
  type WorkspaceBackup,
  type WorkspaceBackupPayload,
} from "@/lib/kwarta/backup";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  Account,
  AuthMode,
  Budget,
  Category,
  Transaction,
  Transfer,
  TransactionType,
} from "@/lib/types";
import { cn, formatCurrency, formatDate, percent } from "@/lib/utils";
import {
  budgetMatchesPeriod,
  createBudgetCyclePeriod,
  createMonthlyPeriod,
  defaultBudgetCycleSettings,
  formatMonthLabel,
  formatPickerDate,
  formatPeriodLabel,
  getBudgetPeriodFields,
  getPeriodNoun,
  formatTime,
  formatTransactionGroupDate,
  getAverageExpenseDayCount,
  getCalendarDays,
  getCurrentTimeInputValue,
  getDefaultCategoryIcon,
  getDefaultTransactionDate,
  getFirstAccountId,
  getFirstCategoryId,
  getSubcategoriesForCategory,
  getPeriodMonth,
  getTransactionFormValues,
  getTransactionGroupSummary,
  getUniqueCategoryId,
  handleDecimalInput,
  isInDateRange,
  isSameDay,
  normalizeBudgetCycleSettings,
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
  type BudgetCycleSettings,
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
  PageHeader,
  ProfileImage,
  PeriodSelector,
  TransactionIcon,
  categoryIconChoices,
  colorChoices,
  getAccountName,
} from "@/components/kwarta/shared";
import { BudgetProgressList } from "@/components/kwarta/budget-progress-list";
import { BudgetsView } from "@/components/kwarta/budgets-view";
import { AccountsView } from "@/components/kwarta/accounts-view";
import { CategoryForm, SubcategoryForm } from "@/components/kwarta/categories";
import {
  BackupActions,
  ImportConfirmationModal,
  ImportLoadingModal,
} from "@/components/kwarta/backup-controls";

type View =
  | "dashboard"
  | "transactions"
  | "budgets"
  | "accounts"
  | "reports"
  | "settings"
  | "manage-categories";

const navigationItems: Array<{
  activeIcon: IconType;
  icon: IconType;
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
    icon: IoPieChartOutline,
    activeIcon: IoPieChart,
    label: "Budgets",
    view: "budgets",
  },
  {
    icon: IoWalletOutline,
    activeIcon: IoWallet,
    label: "Accounts",
    view: "accounts",
  },
  {
    icon: IoSettingsOutline,
    activeIcon: IoSettings,
    label: "Settings",
    view: "settings",
  },
];

type AccentTheme = "black" | "blue" | "green" | "purple";
type ColorMode = "light" | "dark";

const accentThemeOptions: Array<{
  color: string;
  label: string;
  value: AccentTheme;
}> = [
  { color: "#171717", label: "Black", value: "black" },
  { color: "#2563EB", label: "Blue", value: "blue" },
  { color: "#15803D", label: "Green", value: "green" },
  { color: "#7C3AED", label: "Purple", value: "purple" },
];

function isAccentTheme(value: string | null): value is AccentTheme {
  return accentThemeOptions.some((option) => option.value === value);
}

function applyAppearanceWithoutTransition(update: () => void) {
  const root = document.documentElement;

  root.classList.add("appearance-changing");
  update();
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      root.classList.remove("appearance-changing");
    });
  });
}

type StoredWorkspace = WorkspaceBackup;

type PendingBackupImport = {
  workspace: StoredWorkspace;
};

type AutomaticBackupRecord = {
  backup: WorkspaceBackupPayload;
  createdAt: string;
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

async function persistAccount(account: Account, userId: string) {
  const response = await fetch("/api/workspace", {
    body: JSON.stringify({ ...account, userId }),
    headers: { "Content-Type": "application/json" },
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error("Unable to save account.");
  }
}

function getCategorySubcategoriesStorageKey(userId: string) {
  return `kwarta:category-subcategories:${userId}`;
}

function getAutomaticBackupStorageKey(userId: string) {
  return `kwarta:auto-backup:${userId}`;
}

function readAutomaticBackup(userId: string): AutomaticBackupRecord | null {
  try {
    const stored = window.localStorage.getItem(
      getAutomaticBackupStorageKey(userId),
    );

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as Partial<AutomaticBackupRecord>;

    if (
      !parsed.createdAt ||
      !parsed.backup ||
      parsed.backup.type !== "kwarta-workspace"
    ) {
      return null;
    }

    return parsed as AutomaticBackupRecord;
  } catch {
    return null;
  }
}

function persistAutomaticBackupLocally(
  userId: string,
  workspace: StoredWorkspace,
): AutomaticBackupRecord {
  const backup = createWorkspaceBackupPayload(workspace);
  const record = {
    backup,
    createdAt: backup.exportedAt,
  };

  window.localStorage.setItem(
    getAutomaticBackupStorageKey(userId),
    JSON.stringify(record),
  );

  return record;
}

function readStoredCategorySubcategories(userId: string) {
  try {
    const stored = window.localStorage.getItem(
      getCategorySubcategoriesStorageKey(userId),
    );

    if (!stored) {
      return new Map<string, string[]>();
    }

    const parsed = JSON.parse(stored) as Record<string, string[]>;

    return new Map(
      Object.entries(parsed).filter((entry): entry is [string, string[]] =>
        Array.isArray(entry[1]),
      ),
    );
  } catch {
    return new Map<string, string[]>();
  }
}

function persistCategorySubcategoriesLocally(
  userId: string,
  categories: Category[],
) {
  const payload = Object.fromEntries(
    categories.map((category) => [category.id, category.subcategories ?? []]),
  );

  window.localStorage.setItem(
    getCategorySubcategoriesStorageKey(userId),
    JSON.stringify(payload),
  );
}

function mergeStoredCategorySubcategories(
  categories: Category[],
  userId: string,
) {
  const stored = readStoredCategorySubcategories(userId);

  if (stored.size === 0) {
    return categories;
  }

  return categories.map((category) => {
    const subcategories = stored.get(category.id);

    return subcategories
      ? {
          ...category,
          subcategories,
        }
      : category;
  });
}

export function KwartaApp() {
  const [authReady, setAuthReady] = useState(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);
  const [accentTheme, setAccentTheme] = useState<AccentTheme>("black");
  const [colorMode, setColorMode] = useState<ColorMode>("light");
  const [homeItemStyle, setHomeItemStyle] = useState<HomeItemStyle>("ios");
  const [budgetsEnabled, setBudgetsEnabled] = useState(true);
  const [budgetCycleSettings, setBudgetCycleSettings] =
    useState<BudgetCycleSettings>(defaultBudgetCycleSettings);
  const [budgetCycleSettingsReady, setBudgetCycleSettingsReady] =
    useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(() =>
    createMonthlyPeriod(toMonthInputValue(new Date())),
  );
  const [categories, setCategories] = useState<Category[]>(seedCategories);
  const [accounts, setAccounts] = useState<Account[]>(seedAccounts);
  const [transactions, setTransactions] =
    useState<Transaction[]>(seedTransactions);
  const [transfers, setTransfers] = useState<Transfer[]>(seedTransfers);
  const [budgets, setBudgets] = useState<Budget[]>(seedBudgets);
  const [editingTransactionId, setEditingTransactionId] = useState<
    string | null
  >(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [editingTransferId, setEditingTransferId] = useState<string | null>(
    null,
  );
  const [quickAddCategory, setQuickAddCategory] = useState<Category | null>(
    null,
  );
  const [homeCategoryFormOpen, setHomeCategoryFormOpen] = useState(false);
  const [subcategoryFormOpen, setSubcategoryFormOpen] = useState(false);
  const [categoryPendingDelete, setCategoryPendingDelete] =
    useState<Category | null>(null);
  const backupImportInputRef = useRef<HTMLInputElement>(null);
  const quickAddPageRef = useRef<HTMLElement>(null);
  const quickAddFocusBridgeRef = useRef<HTMLInputElement>(null);
  const workspaceSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [backupImportError, setBackupImportError] = useState<string | null>(
    null,
  );
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [pendingBackupImport, setPendingBackupImport] =
    useState<PendingBackupImport | null>(null);
  const [automaticBackup, setAutomaticBackup] =
    useState<AutomaticBackupRecord | null>(null);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const userId = user?.id ?? null;
  const enqueueWorkspaceSave = useCallback((save: () => Promise<void>) => {
    const queuedSave = workspaceSaveQueueRef.current
      .catch(() => undefined)
      .then(save);

    workspaceSaveQueueRef.current = queuedSave;
    return queuedSave;
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");

    function syncLayout() {
      setIsDesktopLayout(query.matches);
    }

    syncLayout();
    query.addEventListener("change", syncLayout);

    return () => {
      query.removeEventListener("change", syncLayout);
    };
  }, []);

  useEffect(() => {
    if (!quickAddCategory || isDesktopLayout || !quickAddPageRef.current) {
      return;
    }

    const target = quickAddPageRef.current;
    const lockViewport = () => {
      target.scrollTop = 0;
      window.scrollTo(0, 0);
    };

    lockViewport();
    disableBodyScroll(target, {
      allowTouchMove: () => false,
      reserveScrollBarGap: false,
    });
    window.addEventListener("scroll", lockViewport, { passive: true });
    window.addEventListener("resize", lockViewport);
    window.visualViewport?.addEventListener("resize", lockViewport);
    window.visualViewport?.addEventListener("scroll", lockViewport);

    return () => {
      window.removeEventListener("scroll", lockViewport);
      window.removeEventListener("resize", lockViewport);
      window.visualViewport?.removeEventListener("resize", lockViewport);
      window.visualViewport?.removeEventListener("scroll", lockViewport);
      enableBodyScroll(target);
    };
  }, [isDesktopLayout, quickAddCategory]);

  useEffect(() => {
    const storedColorMode = window.localStorage.getItem("kwarta:color-mode");
    const initialColorMode: ColorMode =
      storedColorMode === "dark" ? "dark" : "light";

    setColorMode(initialColorMode);
    document.documentElement.classList.toggle(
      "dark",
      initialColorMode === "dark",
    );
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute(
        "content",
        initialColorMode === "dark" ? "#000000" : "#FAFAFA",
      );

    const storedAccentTheme = window.localStorage.getItem(
      "kwarta:accent-theme",
    );
    const initialAccentTheme = isAccentTheme(storedAccentTheme)
      ? storedAccentTheme
      : "black";

    setAccentTheme(initialAccentTheme);
    document.documentElement.dataset.accent = initialAccentTheme;

    const storedHomeItemStyle = window.localStorage.getItem(
      "kwarta:home-item-style",
    );

    if (storedHomeItemStyle === "ios" || storedHomeItemStyle === "cards") {
      setHomeItemStyle(storedHomeItemStyle);
    }

    const storedBudgetsEnabled = window.localStorage.getItem(
      "kwarta:budgets-enabled",
    );

    if (storedBudgetsEnabled === "true" || storedBudgetsEnabled === "false") {
      setBudgetsEnabled(storedBudgetsEnabled === "true");
    }

    const storedBudgetCycleSettings = window.localStorage.getItem(
      "kwarta:budget-cycle-settings",
    );

    if (storedBudgetCycleSettings) {
      try {
        setBudgetCycleSettings(
          normalizeBudgetCycleSettings(
            JSON.parse(storedBudgetCycleSettings) as BudgetCycleSettings,
          ),
        );
      } catch {
        setBudgetCycleSettings(defaultBudgetCycleSettings);
      }
    }

    setBudgetCycleSettingsReady(true);

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
    if (!budgetCycleSettingsReady) {
      return;
    }

    window.localStorage.setItem(
      "kwarta:budget-cycle-settings",
      JSON.stringify(budgetCycleSettings),
    );
  }, [budgetCycleSettings, budgetCycleSettingsReady]);

  useEffect(() => {
    if (!isAuthed || !userId) {
      setWorkspaceReady(false);
      setAutomaticBackup(null);
      return;
    }

    let cancelled = false;
    const activeUserId = userId;
    setAutomaticBackup(readAutomaticBackup(activeUserId));

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
          mergeStoredCategorySubcategories(
            withCategoryIcons(workspace.categories),
            activeUserId,
          ),
        );
        setAccounts(workspace.accounts);
        setTransactions(workspace.transactions);
        setTransfers(workspace.transfers ?? []);
        setBudgets(workspace.budgets);
      } catch {
        if (cancelled) {
          return;
        }

        setCategories(seedCategories);
        setAccounts(seedAccounts);
        setTransactions([]);
        setTransfers([]);
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

    persistCategorySubcategoriesLocally(userId, categories);

    const workspace = {
      accounts,
      budgets,
      categories,
      transactions,
      transfers,
    };
    setAutomaticBackup((current) => {
      const today = toDateInputValue(new Date());

      if (current?.createdAt.slice(0, 10) === today) {
        return current;
      }

      return persistAutomaticBackupLocally(userId, workspace);
    });

    const timeout = window.setTimeout(() => {
      enqueueWorkspaceSave(() => persistWorkspace(workspace, userId)).catch(
        () => {
          // The UI remains usable; the next successful change will retry persistence.
        },
      );
    }, 350);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    accounts,
    budgets,
    categories,
    transactions,
    transfers,
    userId,
    workspaceReady,
    enqueueWorkspaceSave,
  ]);

  const selectedMonth = getPeriodMonth(selectedPeriod);
  const periodTransactions = useMemo(
    () =>
      transactions.filter((transaction) =>
        isInDateRange(
          transaction.date,
          selectedPeriod.startDate,
          selectedPeriod.endDate,
        ),
      ),
    [selectedPeriod.endDate, selectedPeriod.startDate, transactions],
  );
  const periodBudgets = useMemo(
    () =>
      budgets.filter((budget) => budgetMatchesPeriod(budget, selectedPeriod)),
    [budgets, selectedPeriod],
  );

  const totals = useMemo(() => {
    const income = periodTransactions
      .filter((transaction) => transaction.type === "income")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const expenses = periodTransactions
      .filter((transaction) => transaction.type === "expense")
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    return {
      income,
      expenses,
      balance: income - expenses,
    };
  }, [periodTransactions]);

  const expenseCategories = categories.filter(
    (category) => normalizeTransactionType(category.type) === "expense",
  );
  const incomeCategories = categories.filter(
    (category) => normalizeTransactionType(category.type) === "income",
  );
  const accountName = getAccountName(user);
  const selectedPeriodLabel = formatPeriodLabel(selectedPeriod);
  const todayDate = toDateInputValue(new Date());
  const quickAddDefaultDate = isInDateRange(
    todayDate,
    selectedPeriod.startDate,
    selectedPeriod.endDate,
  )
    ? todayDate
    : selectedPeriod.startDate;
  const quickAddBudget = quickAddCategory
    ? periodBudgets.find((budget) => budget.categoryId === quickAddCategory.id)
    : undefined;
  const selectedBudgetPeriod = getBudgetPeriodFields(
    selectedPeriod,
    budgetCycleSettings,
  );

  function updateBudgetCycleSettings(settings: BudgetCycleSettings) {
    const normalized = normalizeBudgetCycleSettings(settings);

    setBudgetCycleSettings(normalized);
    setSelectedPeriod((current) =>
      current.frequency === "cycle"
        ? createBudgetCyclePeriod(current.startDate, normalized)
        : current,
    );
  }

  function closeQuickAdd() {
    setQuickAddCategory(null);
  }

  function openQuickAdd(category: Category) {
    if (!isDesktopLayout) {
      quickAddFocusBridgeRef.current?.focus({ preventScroll: true });
    }

    setQuickAddCategory(category);
  }

  function handleQuickAddBudget(limit: number) {
    if (!quickAddCategory) {
      return;
    }

    setBudgets((current) => {
      const existingBudget = current.find(
        (budget) =>
          budget.categoryId === quickAddCategory.id &&
          budgetMatchesPeriod(budget, selectedPeriod),
      );

      if (existingBudget) {
        return current.map((budget) =>
          budget.id === existingBudget.id ? { ...budget, limit } : budget,
        );
      }

      return [
        {
          id: crypto.randomUUID(),
          categoryId: quickAddCategory.id,
          ...selectedBudgetPeriod,
          limit,
        },
        ...current,
      ];
    });
    setQuickAddCategory(null);
  }

  function handleQuickAddReusableBudget(limit: number) {
    if (!quickAddCategory) {
      return;
    }

    setBudgets((current) =>
      upsertReusableBudgets(current, {
        categoryId: quickAddCategory.id,
        ...selectedBudgetPeriod,
        limit,
        reuseBudget: true,
      }),
    );
    setQuickAddCategory(null);
  }

  function handleQuickAddTransaction({
    amount,
    accountId,
    date,
    subcategory,
  }: {
    amount: number;
    accountId?: string;
    date: string;
    subcategory: string;
  }) {
    if (!quickAddCategory) {
      return;
    }

    setTransactions((current) => [
      {
        id: crypto.randomUUID(),
        amount,
        categoryId: quickAddCategory.id,
        accountId: accountId || getFirstAccountId(accounts),
        date,
        subcategory,
        note: "",
        time: getCurrentTimeInputValue(),
        type: quickAddCategory.type,
      },
      ...current,
    ]);
    setQuickAddCategory(null);
  }

  function handleSubcategorySubmit(values: SubcategoryFormValues) {
    setCategories((current) =>
      current.map((category) =>
        category.id === values.categoryId
          ? {
              ...category,
              subcategories: values.subcategories,
            }
          : category,
      ),
    );
    setSubcategoryFormOpen(false);
  }

  const spendingByCategory = useMemo(() => {
    return expenseCategories
      .map((category) => ({
        name: category.name,
        value: periodTransactions
          .filter(
            (transaction) =>
              transaction.type === "expense" &&
              transaction.categoryId === category.id,
          )
          .reduce((sum, transaction) => sum + transaction.amount, 0),
        color: category.color,
      }))
      .filter((item) => item.value > 0);
  }, [expenseCategories, periodTransactions]);

  const cashflowData = useMemo(() => {
    return periodTransactions
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((transaction) => ({
        date: new Date(transaction.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        income: transaction.type === "income" ? transaction.amount : 0,
        expense: transaction.type === "expense" ? transaction.amount : 0,
      }));
  }, [periodTransactions]);

  function getCurrentWorkspace(): StoredWorkspace {
    return {
      accounts,
      budgets,
      categories,
      transactions,
      transfers,
    };
  }

  async function applyWorkspaceImport(nextWorkspace: StoredWorkspace) {
    const nextCategories = withCategoryIcons(nextWorkspace.categories);

    if (userId) {
      persistCategorySubcategoriesLocally(userId, nextCategories);
    }

    setAccounts(nextWorkspace.accounts);
    setBudgets(nextWorkspace.budgets);
    setCategories(nextCategories);
    setTransactions(nextWorkspace.transactions);
    setTransfers(nextWorkspace.transfers);
    setEditingBudgetId(null);
    setEditingTransactionId(null);
    setBackupImportError(null);

    if (userId) {
      await persistWorkspace(nextWorkspace, userId);
    }
  }

  async function handleBackupImportFile(file: File) {
    setIsImportingBackup(true);
    let nextWorkspace: StoredWorkspace;

    try {
      nextWorkspace = parseWorkspaceBackupPayload(
        JSON.parse(await file.text()),
        getCurrentWorkspace(),
      );
    } catch {
      setBackupImportError(
        "Backup could not be imported. Check that this is a Kwarta JSON backup.",
      );
      setIsImportingBackup(false);
      return;
    }

    if (
      accounts.length > 0 ||
      budgets.length > 0 ||
      categories.length > 0 ||
      transactions.length > 0 ||
      transfers.length > 0
    ) {
      setPendingBackupImport({
        workspace: nextWorkspace,
      });
      setIsImportingBackup(false);
      return;
    }

    try {
      await applyWorkspaceImport(nextWorkspace);
    } catch {
      setBackupImportError(
        "Backup was loaded but could not be saved. Please try importing again.",
      );
    }
    setIsImportingBackup(false);
  }

  async function confirmBackupImport() {
    if (!pendingBackupImport) {
      return;
    }

    const nextImport = pendingBackupImport;
    setPendingBackupImport(null);
    setIsImportingBackup(true);

    try {
      await applyWorkspaceImport(nextImport.workspace);
    } catch {
      setBackupImportError(
        "Backup was loaded but could not be saved. Please try importing again.",
      );
    }

    setIsImportingBackup(false);
  }

  function handleAutomaticBackupDownload() {
    if (!automaticBackup) {
      return;
    }

    downloadWorkspaceBackupPayload(
      automaticBackup.backup,
      automaticBackup.createdAt.slice(0, 10),
    );
  }

  function handleAutomaticBackupRestore() {
    if (!automaticBackup) {
      return;
    }

    try {
      setPendingBackupImport({
        workspace: parseWorkspaceBackupPayload(
          automaticBackup.backup,
          getCurrentWorkspace(),
        ),
      });
      setBackupImportError(null);
    } catch {
      setBackupImportError(
        "Automatic backup could not be restored. Please download it and import the file manually.",
      );
    }
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
            setAuthError("Add Supabase env vars to enable account login.");
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
          setIsAuthed(Boolean(result.data.session || result.data.user));
        }}
        onGoogleLogin={async () => {
          setAuthError(null);

          if (!supabase) {
            setAuthError("Add Supabase env vars to enable Google login.");
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

  const quickAddFocusBridge = (
    <input
      ref={quickAddFocusBridgeRef}
      aria-hidden="true"
      className="fixed bottom-0 left-0 h-px w-px border-0 bg-transparent p-0 text-base opacity-[0.01] outline-none"
      inputMode="decimal"
      tabIndex={-1}
      type="text"
    />
  );

  if (quickAddCategory && !isDesktopLayout) {
    return (
      <>
        {quickAddFocusBridge}
        <RemoveScroll
          allowPinchZoom
          className="fixed inset-0 overflow-hidden bg-white"
          removeScrollBar={false}
        >
          <main
            ref={quickAddPageRef}
            className="h-full overflow-hidden bg-white"
          >
            <QuickTransactionModal
              accounts={accounts}
              budget={quickAddBudget}
              budgetsEnabled={budgetsEnabled}
              category={quickAddCategory}
              mobileFocusBridgeRef={quickAddFocusBridgeRef}
              month={selectedMonth}
              defaultDate={quickAddDefaultDate}
              periodLabel={selectedPeriodLabel}
              periodNoun={getPeriodNoun(selectedPeriod)}
              presentation="page"
              onClose={closeQuickAdd}
              onSetBudget={handleQuickAddBudget}
              onSetReusableBudget={handleQuickAddReusableBudget}
              onSubmit={handleQuickAddTransaction}
            />
          </main>
        </RemoveScroll>
      </>
    );
  }

  return (
    <>
      {quickAddFocusBridge}
      <DesktopSidebar activeView={view} onSelect={setView} />
      <main className="min-h-screen bg-background md:pl-64">
        <header className="sticky top-0 z-30 border-b bg-white [backface-visibility:hidden] [transform:translateZ(0)]">
          <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 md:px-5 md:py-4">
            <div className="w-full max-w-[36rem] md:w-auto md:max-w-none">
              <PeriodSelector
                budgetCycleSettings={budgetCycleSettings}
                value={selectedPeriod}
                onBudgetCycleSettingsChange={updateBudgetCycleSettings}
                onChange={setSelectedPeriod}
              />
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-7xl px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 md:px-5 md:py-7">
          {view === "dashboard" && (
            <HomeView
              budgets={periodBudgets}
              budgetsEnabled={budgetsEnabled}
              expenseCategories={expenseCategories}
              homeItemStyle={homeItemStyle}
              incomeCategories={incomeCategories}
              onDeleteCategory={setCategoryPendingDelete}
              onEditCategory={(category) => setEditingCategoryId(category.id)}
              onReorderCategory={(type, fromId, toId) =>
                setCategories((current) =>
                  reorderCategoriesByType(current, type, fromId, toId),
                )
              }
              onSelectCategory={openQuickAdd}
              transactions={periodTransactions}
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
                  current.filter((transaction) => transaction.id !== id),
                )
              }
              onEdit={(transaction) => setEditingTransactionId(transaction.id)}
              accounts={accounts}
              onSubmit={(values) => {
                if (editingTransactionId) {
                  setTransactions((current) =>
                    current.map((transaction) =>
                      transaction.id === editingTransactionId
                        ? {
                            ...transaction,
                            ...values,
                            accountId: values.accountId || undefined,
                            note: values.note || "",
                            time: normalizeTimeValue(values.time),
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
                    accountId: values.accountId || getFirstAccountId(accounts),
                    note: values.note || "",
                    time:
                      values.time === "00:00"
                        ? getCurrentTimeInputValue()
                        : normalizeTimeValue(values.time),
                  },
                  ...current,
                ]);
              }}
              transactions={periodTransactions}
            />
          )}

          {view === "budgets" && (
            <BudgetsView
              allBudgets={budgets}
              budgets={periodBudgets}
              budgetsEnabled={budgetsEnabled}
              categories={expenseCategories}
              cycleSettings={budgetCycleSettings}
              editingId={editingBudgetId}
              month={selectedMonth}
              period={selectedPeriod}
              periodLabel={selectedPeriodLabel}
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
                    upsertReusableBudgets(current, values, editingBudgetId),
                  );
                  setEditingBudgetId(null);
                  return;
                }

                setBudgets((current) => upsertReusableBudgets(current, values));
              }}
              transactions={periodTransactions}
            />
          )}

          {view === "accounts" && (
            <AccountsView
              accounts={accounts}
              editingId={editingAccountId}
              editingTransferId={editingTransferId}
              month={selectedMonth}
              onCancelEdit={() => setEditingAccountId(null)}
              onCancelEditTransfer={() => setEditingTransferId(null)}
              onDelete={(id) => {
                setAccounts((current) =>
                  current.filter((account) => account.id !== id),
                );
                setTransactions((current) =>
                  current.map((transaction) =>
                    transaction.accountId === id
                      ? {
                          ...transaction,
                          accountId: undefined,
                        }
                      : transaction,
                  ),
                );
                setTransfers((current) =>
                  current.filter(
                    (transfer) =>
                      transfer.fromAccountId !== id &&
                      transfer.toAccountId !== id,
                  ),
                );
              }}
              onDeleteTransfer={(id) => {
                setTransfers((current) =>
                  current.filter((transfer) => transfer.id !== id),
                );
              }}
              onEdit={(account) => setEditingAccountId(account.id)}
              onEditTransfer={(transfer) => setEditingTransferId(transfer.id)}
              onSubmit={(values, accountId) => {
                if (accountId) {
                  const updatedAccount = {
                    ...accounts.find((account) => account.id === accountId),
                    ...values,
                    id: accountId,
                  } as Account;

                  setAccounts((current) =>
                    current.map((account) =>
                      account.id === accountId ? updatedAccount : account,
                    ),
                  );
                  setEditingAccountId(null);

                  if (userId) {
                    enqueueWorkspaceSave(() =>
                      persistAccount(updatedAccount, userId),
                    ).catch(() => {
                      // The regular workspace save will retry this update.
                    });
                  }

                  return;
                }

                setAccounts((current) => [
                  ...current,
                  { id: crypto.randomUUID(), ...values },
                ]);
              }}
              onSubmitTransfer={(values) => {
                if (editingTransferId) {
                  setTransfers((current) =>
                    current.map((transfer) =>
                      transfer.id === editingTransferId
                        ? {
                            ...transfer,
                            ...values,
                            note: values.note || "",
                          }
                        : transfer,
                    ),
                  );
                  setEditingTransferId(null);
                  return;
                }

                setTransfers((current) => [
                  {
                    id: crypto.randomUUID(),
                    ...values,
                    note: values.note || "",
                  },
                  ...current,
                ]);
              }}
              transactions={transactions}
              transfers={transfers}
            />
          )}

          {view === "reports" && (
            <div className="space-y-6">
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1 text-sm leading-5"
              >
                <button
                  className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  type="button"
                  onClick={() => setView("settings")}
                >
                  Settings
                </button>
                <ChevronRight
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden
                />
                <span aria-current="page">Reports</span>
              </nav>

              <div>
                <PageHeader
                  title="Reports"
                  description={`Income, expenses, and spending insights for ${selectedPeriodLabel}.`}
                />
              </div>
              <section>
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
                budgets={periodBudgets}
                budgetsEnabled={budgetsEnabled}
                categories={expenseCategories}
                cashflowData={cashflowData}
                spendingByCategory={spendingByCategory}
                transactions={periodTransactions}
              />
            </div>
          )}

          {view === "settings" && (
            <SettingsView
              accentTheme={accentTheme}
              accountName={accountName}
              email={user?.email ?? "Account session"}
              backupImportError={backupImportError}
              backupImportInputRef={backupImportInputRef}
              automaticBackup={automaticBackup}
              budgetsEnabled={budgetsEnabled}
              colorMode={colorMode}
              homeItemStyle={homeItemStyle}
              user={user}
              onManageCategories={() => setView("manage-categories")}
              onViewReports={() => setView("reports")}
              onBudgetsEnabledChange={setBudgetsEnabled}
              onBackupExport={() =>
                downloadWorkspaceBackupFile(getCurrentWorkspace())
              }
              onBackupImportClick={() => backupImportInputRef.current?.click()}
              onBackupImportFile={handleBackupImportFile}
              onAutomaticBackupDownload={handleAutomaticBackupDownload}
              onAutomaticBackupRestore={handleAutomaticBackupRestore}
              onColorModeChange={(mode) => {
                applyAppearanceWithoutTransition(() => {
                  setColorMode(mode);
                  document.documentElement.classList.toggle(
                    "dark",
                    mode === "dark",
                  );
                  document
                    .querySelector('meta[name="theme-color"]')
                    ?.setAttribute(
                      "content",
                      mode === "dark" ? "#000000" : "#FAFAFA",
                    );
                  window.localStorage.setItem("kwarta:color-mode", mode);
                });
              }}
              onAccentThemeChange={(theme) => {
                applyAppearanceWithoutTransition(() => {
                  setAccentTheme(theme);
                  document.documentElement.dataset.accent = theme;
                  window.localStorage.setItem("kwarta:accent-theme", theme);
                });
              }}
              onHomeItemStyleChange={setHomeItemStyle}
              onSignOut={async () => {
                await supabase?.auth.signOut();
                setUser(null);
                setIsAuthed(false);
              }}
            />
          )}
          {view === "manage-categories" && (
            <ManageCategoriesView
              expenseCategories={expenseCategories}
              incomeCategories={incomeCategories}
              onAddCategory={() => setHomeCategoryFormOpen(true)}
              onBack={() => setView("settings")}
              onEditCategory={(category) => setEditingCategoryId(category.id)}
              onManageSubcategories={() => setSubcategoryFormOpen(true)}
              onReorderCategory={(type, fromId, toId) =>
                setCategories((current) =>
                  reorderCategoriesByType(current, type, fromId, toId),
                )
              }
            />
          )}
        </div>
        {quickAddCategory && isDesktopLayout && (
          <QuickTransactionModal
            accounts={accounts}
            budget={quickAddBudget}
            budgetsEnabled={budgetsEnabled}
            category={quickAddCategory}
            month={selectedMonth}
            defaultDate={quickAddDefaultDate}
            periodLabel={selectedPeriodLabel}
            periodNoun={getPeriodNoun(selectedPeriod)}
            onClose={closeQuickAdd}
            onSetBudget={handleQuickAddBudget}
            onSetReusableBudget={handleQuickAddReusableBudget}
            onSubmit={handleQuickAddTransaction}
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
                    id: getUniqueCategoryId(values.name, current),
                    ...values,
                  },
                  ...current,
                ]);
                setHomeCategoryFormOpen(false);
              }}
            />
          </EditModal>
        )}
        {subcategoryFormOpen && (
          <EditModal
            allowContentScroll
            onClose={() => setSubcategoryFormOpen(false)}
          >
            <SubcategoryForm
              categories={categories}
              modal
              onCancel={() => setSubcategoryFormOpen(false)}
              onSubmit={handleSubcategorySubmit}
            />
          </EditModal>
        )}
        {editingCategoryId &&
          categories.find((category) => category.id === editingCategoryId) && (
            <EditModal onClose={() => setEditingCategoryId(null)}>
              <CategoryForm
                editing={
                  categories.find(
                    (category) => category.id === editingCategoryId,
                  )!
                }
                onCancel={() => setEditingCategoryId(null)}
                onDelete={() => {
                  const categoryId = editingCategoryId;

                  setCategories((current) =>
                    current.filter((category) => category.id !== categoryId),
                  );
                  setTransactions((current) =>
                    current.filter(
                      (transaction) => transaction.categoryId !== categoryId,
                    ),
                  );
                  setBudgets((current) =>
                    current.filter(
                      (budget) => budget.categoryId !== categoryId,
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
                current.filter((category) => category.id !== categoryId),
              );
              setTransactions((current) =>
                current.filter(
                  (transaction) => transaction.categoryId !== categoryId,
                ),
              );
              setBudgets((current) =>
                current.filter((budget) => budget.categoryId !== categoryId),
              );
              setCategoryPendingDelete(null);
            }}
          />
        )}
        {pendingBackupImport && (
          <ImportConfirmationModal
            onCancel={() => setPendingBackupImport(null)}
            onConfirm={confirmBackupImport}
          />
        )}
        {isImportingBackup && <ImportLoadingModal />}
        <MobileTabBar activeView={view} onSelect={setView} />
      </main>
    </>
  );
}

function AuthLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-sm p-6 text-center space-y-4">
        <div className="flex gap-2 justify-center items-center">
          <div className="w-fit">
            <LogoMark size={40} />
          </div>
          <h1 className="text-4xl font-semibold">Kwarta</h1>
        </div>
        <p className="mt-2 inline-flex items-center justify-center gap-2 text-sm leading-5 text-muted-foreground">
          <span
            className="h-8 w-8 shrink-0 animate-spin rounded-full border-[3px] border-border border-t-foreground"
            aria-hidden
          />
        </p>
      </div>
    </main>
  );
}

function DesktopSidebar({
  activeView,
  onSelect,
}: {
  activeView: View;
  onSelect: (view: View) => void;
}) {
  const currentNavView =
    activeView === "manage-categories" || activeView === "reports"
      ? "settings"
      : activeView;

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-white md:flex">
      <div className="w-full mb-2 pt-4 border-border px-4 text-left">
        <button
          aria-label="Go to Home"
          type="button"
          onClick={() => onSelect("dashboard")}
          className="cursor-pointer gap-2 items-center flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <LogoMark size={30} />
          <span className="text-xl font-semibold leading-7">Kwarta</span>
        </button>
      </div>
      <nav aria-label="Primary navigation" className="flex-1 space-y-1 p-3">
        {navigationItems.map((item) => {
          const active = currentNavView === item.view;
          const Icon = item.icon;

          return (
            <button
              className={cn(
                "flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hover:bg-[hsl(var(--hover-surface))] md:hover:text-foreground",
                active && "bg-neutral-100 text-foreground",
              )}
              key={item.view}
              type="button"
              onClick={() => onSelect(item.view)}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
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
    activeView === "manage-categories" || activeView === "reports"
      ? "settings"
      : activeView;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] backdrop-blur-md md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {navigationItems.map((item) => {
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
              <span className="max-w-full truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function SettingsView({
  accentTheme,
  accountName,
  automaticBackup,
  backupImportError,
  backupImportInputRef,
  budgetsEnabled,
  colorMode,
  email,
  homeItemStyle,
  user,
  onBackupExport,
  onBackupImportClick,
  onBackupImportFile,
  onAutomaticBackupDownload,
  onAutomaticBackupRestore,
  onColorModeChange,
  onAccentThemeChange,
  onBudgetsEnabledChange,
  onHomeItemStyleChange,
  onManageCategories,
  onViewReports,
  onSignOut,
}: {
  accentTheme: AccentTheme;
  accountName: string;
  automaticBackup: AutomaticBackupRecord | null;
  backupImportError: string | null;
  backupImportInputRef: RefObject<HTMLInputElement>;
  budgetsEnabled: boolean;
  colorMode: ColorMode;
  email: string;
  homeItemStyle: HomeItemStyle;
  user: User | null;
  onBackupExport: () => void;
  onBackupImportClick: () => void;
  onBackupImportFile: (file: File) => void;
  onAutomaticBackupDownload: () => void;
  onAutomaticBackupRestore: () => void;
  onColorModeChange: (mode: ColorMode) => void;
  onAccentThemeChange: (theme: AccentTheme) => void;
  onBudgetsEnabledChange: (enabled: boolean) => void;
  onHomeItemStyleChange: (style: HomeItemStyle) => void;
  onManageCategories: () => void;
  onViewReports: () => void;
  onSignOut: () => void;
}) {
  const options: Array<{
    icon: LucideIcon;
    label: string;
    value: HomeItemStyle;
  }> = [
    {
      icon: List,
      label: "List",
      value: "ios",
    },
    {
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
        actions={
          <div className="flex w-full gap-2 sm:w-auto">
            <Button
              className="min-w-0 flex-1 sm:flex-none"
              type="button"
              variant="secondary"
              onClick={onViewReports}
            >
              <IoStatsChart className="h-4 w-4" aria-hidden />
              Reports
            </Button>
            <Button
              className="min-w-0 flex-1 sm:flex-none"
              type="button"
              onClick={onManageCategories}
            >
              <IoPricetagsOutline className="h-4 w-4" aria-hidden />
              Manage categories
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:gap-5 lg:grid-cols-2">
        <Card className="overflow-visible bg-white">
          <CardHeader>
            <CardTitle>General</CardTitle>
            {/* <p className="text-sm leading-5 text-muted-foreground">
              Control core app behavior and visibility.
            </p> */}
          </CardHeader>
          <CardContent className="">
            <div className="border-t h-[72px] flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium leading-5">Home layout</p>
                {/* <p className="mt-1 text-sm leading-5 text-muted-foreground">
                                        Choose how category items appear on the
                                        Home page.
                                    </p> */}
              </div>
              <div className="w-40 sm:w-[200px]">
                <Select
                  aria-label="Home layout"
                  options={options.map((option) => {
                    const Icon = option.icon;

                    return {
                      icon: <Icon className="h-4 w-4" aria-hidden />,
                      label: option.label,
                      value: option.value,
                    };
                  })}
                  value={homeItemStyle}
                  onValueChange={(value) =>
                    onHomeItemStyleChange(value as HomeItemStyle)
                  }
                />
              </div>
            </div>
            <div className="border-t border-border h-[72px] flex items-center">
              <SettingsSwitch
                checked={colorMode === "dark"}
                description="Use a dark interface across Kwarta."
                descriptionDisplay="menu"
                id="dark-mode"
                label="Dark mode"
                onChange={(checked) =>
                  onColorModeChange(checked ? "dark" : "light")
                }
              />
            </div>
            <div className="border-t border-border h-[72px] gap-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium leading-5">Accent color</p>
                {/* <p className="mt-1 text-sm leading-5 text-muted-foreground">
                                        Choose the app&apos;s accent color.
                                    </p> */}
              </div>
              <div className="w-40 sm:w-[200px]">
                <Select
                  aria-label="Accent color"
                  compactOptions
                  options={accentThemeOptions.map((option) => ({
                    icon: (
                      <span
                        className="h-2 w-2 rounded-full bg-current"
                        style={{
                          color:
                            colorMode === "dark" && option.value === "black"
                              ? "#F5F5F5"
                              : option.color,
                        }}
                      />
                    ),
                    label:
                      colorMode === "dark" && option.value === "black"
                        ? "White"
                        : option.label,
                    value: option.value,
                  }))}
                  value={accentTheme}
                  onValueChange={(value) =>
                    onAccentThemeChange(value as AccentTheme)
                  }
                />
              </div>
            </div>
            <div className="border-t border-border h-[72px] flex items-center">
              <SettingsSwitch
                checked={!budgetsEnabled}
                description="Add expenses without setting category budgets."
                descriptionDisplay="menu"
                id="disable-budget-tracking"
                label="Disable Budget Tracking"
                onChange={(checked) => onBudgetsEnabledChange(!checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden bg-white">
          <CardHeader>
            <CardTitle>Backup</CardTitle>
            {/* <p className="text-sm leading-5 text-muted-foreground">
              Import or export your full Kwarta workspace as a JSON backup.
            </p> */}
          </CardHeader>
          <CardContent className="space-y-3">
            <BackupActionRow
              description="Transactions, budgets, accounts, categories, and subcategories."
              error={backupImportError}
              importInputRef={backupImportInputRef}
              label="Workspace data"
              onExport={onBackupExport}
              onImportClick={onBackupImportClick}
              onImportFile={onBackupImportFile}
            />
            <AutomaticBackupSummary
              backup={automaticBackup}
              onDownload={onAutomaticBackupDownload}
              onRestore={onAutomaticBackupRestore}
            />
          </CardContent>
        </Card>

        <Card className="overflow-hidden bg-white">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            {/* <p className="text-sm leading-5 text-muted-foreground">
              Review your signed-in profile and session access.
            </p> */}
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3 rounded-lg border border-border bg-neutral-50 p-3">
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
                <p className="truncate font-medium leading-5">{accountName}</p>
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
  descriptionDisplay = "inline",
  id,
  label,
  onChange,
}: {
  checked: boolean;
  description: string;
  descriptionDisplay?: "inline" | "menu";
  id: string;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isInfoOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (infoRef.current && !infoRef.current.contains(event.target as Node)) {
        setIsInfoOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isInfoOpen]);

  return (
    <div className="relative flex w-full items-center justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Label htmlFor={id}>{label}</Label>
          {descriptionDisplay === "menu" && (
            <div className="sm:relative" ref={infoRef}>
              <button
                aria-expanded={isInfoOpen}
                aria-haspopup="dialog"
                aria-label={`About ${label}`}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 md:hover:bg-[hsl(var(--hover-surface))] md:hover:text-foreground"
                type="button"
                onClick={() => setIsInfoOpen((open) => !open)}
              >
                <Info className="h-3.5 w-3.5" aria-hidden />
              </button>
              {isInfoOpen && (
                <div
                  className="absolute bottom-full left-1/2 z-20 mb-2 w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg border border-border bg-white p-3 shadow-sm sm:left-0 sm:w-64 sm:translate-x-0"
                  role="dialog"
                >
                  <p className="text-sm leading-5 text-muted-foreground">
                    {description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        {descriptionDisplay === "inline" && (
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <button
        aria-checked={checked}
        data-theme-switch={id === "dark-mode" ? "true" : undefined}
        className={cn(
          "relative inline-block h-6 w-10 shrink-0 cursor-pointer rounded-full transition-[background,border-color] duration-150 ease-[cubic-bezier(0,0,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
          checked ? "bg-accent" : "bg-neutral-300",
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

function AutomaticBackupSummary({
  backup,
  onDownload,
  onRestore,
}: {
  backup: AutomaticBackupRecord | null;
  onDownload: () => void;
  onRestore: () => void;
}) {
  const details = backup
    ? [
        `${backup.backup.transactions.length} transactions`,
        `${backup.backup.budgets.length} budgets`,
        `${backup.backup.accounts.length} accounts`,
        `${backup.backup.categories.length} categories`,
      ].join(", ")
    : "A latest daily snapshot will appear here after the workspace loads.";
  const createdAt = backup
    ? new Date(backup.createdAt).toLocaleString("en-US", {
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-5">Latest automatic backup</p>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {createdAt ? `Created ${createdAt}. ${details}.` : details}
        </p>
      </div>
      <div className="grid w-full grid-cols-2 gap-2">
        <Button
          className="w-full justify-center"
          disabled={!backup}
          type="button"
          variant="secondary"
          onClick={onRestore}
        >
          <Upload className="h-4 w-4" aria-hidden />
          Restore
        </Button>
        <Button
          className="w-full justify-center"
          disabled={!backup}
          type="button"
          variant="secondary"
          onClick={onDownload}
        >
          <Download className="h-4 w-4" aria-hidden />
          Download
        </Button>
      </div>
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
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium leading-5">{label}</p>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <BackupActions
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
      className="shrink-0 rounded-md bg-black p-[2px] dark:invert"
      height={size}
      priority
      src="/icons/icon-192.png"
      unoptimized
      width={size}
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
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-5 px-5 py-8 sm:gap-10 sm:py-10 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section>
          <div className="mb-0 flex items-center gap-2 sm:mb-8">
            <LogoMark size={40} />
            <span className="text-4xl font-semibold">Kwarta</span>
          </div>
          <h1 className="hidden max-w-2xl text-4xl font-semibold leading-tight tracking-normal text-foreground sm:block md:text-5xl">
            A precise budget tracker for clearer everyday money decisions.
          </h1>
          <p className="mt-5 hidden max-w-xl text-base leading-7 text-muted-foreground sm:block">
            Manage income, expenses, categories, and budget limits in a focused
            product workspace designed for repeat use.
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
              {mode === "login" ? "Sign in with Google" : "Sign up with Google"}
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
              <FieldError message={form.formState.errors.email?.message}>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...form.register("email")} />
              </FieldError>
              <FieldError message={form.formState.errors.password?.message}>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...form.register("password")}
                />
              </FieldError>
              <Button className="w-full" type="submit">
                {mode === "login" ? "Sign in" : "Create account"}
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
                  onModeChange(mode === "login" ? "register" : "login")
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
            This will remove the card, its transactions, and any budgets linked
            to this category.
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
