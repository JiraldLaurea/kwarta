"use client";

import { disableBodyScroll, enableBodyScroll } from "body-scroll-lock";
import { LuChevronRight as ChevronRight } from "react-icons/lu";
import { FaRegLightbulb } from "react-icons/fa6";
import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RemoveScroll } from "react-remove-scroll";
import { DashboardView } from "@/components/kwarta/dashboard-view";
import {
    type HomeItemStyle,
    HomeView,
    ManageCategoriesView,
    QuickTransactionModal,
    isHomeItemStyle,
} from "@/components/kwarta/home-view";
import { TransactionsView } from "@/components/kwarta/transactions-view";
import {
    accounts as seedAccounts,
    budgets as seedBudgets,
    categories as seedCategories,
    transactions as seedTransactions,
    transfers as seedTransfers,
} from "@/lib/data";
import { type SubcategoryFormValues } from "@/lib/schema";
import {
    createWorkspaceBackupPayload,
    downloadWorkspaceBackupPayload,
    downloadWorkspaceBackupFile,
    parseWorkspaceBackupPayload,
    type WorkspaceBackup,
} from "@/lib/kwarta/backup";
import {
    hasPendingWorkspaceSync,
    markWorkspacePendingSync,
    readCachedWorkspace,
    writeCachedWorkspace,
} from "@/lib/kwarta/offline-cache";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
    Account,
    AuthMode,
    Budget,
    Category,
    Transaction,
    Transfer,
} from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import {
    budgetMatchesPeriod,
    createBudgetCyclePeriod,
    createMonthlyPeriod,
    defaultBudgetCycleSettings,
    formatPeriodLabel,
    getBudgetPeriodFields,
    getPeriodNoun,
    getCurrentTimeInputValue,
    getFirstAccountId,
    getPeriodMonth,
    getUniqueCategoryId,
    isInDateRange,
    normalizeBudgetCycleSettings,
    normalizeTimeValue,
    normalizeTransactionType,
    parseDateValue,
    parseMonthValue,
    reorderCategoriesByType,
    toDateInputValue,
    toMonthInputValue,
    upsertReusableBudgets,
    withCategoryIcons,
    type BudgetCycleSettings,
    type SelectedPeriod,
} from "@/lib/kwarta/helpers";
import {
    EditModal,
    MetricCard,
    PageHeader,
    PeriodSelector,
    SwipeBackArea,
    getAccountName,
    useSwipeToClose,
} from "@/components/kwarta/shared";
import { BudgetsView } from "@/components/kwarta/budgets-view";
import { AccountsView } from "@/components/kwarta/accounts-view";
import { CategoryForm, SubcategoryForm } from "@/components/kwarta/categories";
import { ImportConfirmationModal, ImportLoadingModal } from "@/components/kwarta/backup-controls";
import {
    DesktopSidebar,
    MobileTabBar,
} from "@/components/kwarta/app-navigation";
import { SettingsView } from "@/components/kwarta/settings-view";
import { HelpPanel } from "@/components/kwarta/help-panel";
import {
    AuthLoadingScreen,
    AuthScreen,
} from "@/components/kwarta/auth-screen";
import { DeleteCategoryConfirmationModal } from "@/components/kwarta/delete-category-modal";
import {
    isAccentTheme,
    type AccentTheme,
    type AutomaticBackupRecord,
    type ColorMode,
    type View,
} from "@/components/kwarta/app-types";

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

// Mobile-only bottom sheet for the home quick-add flow: slides up from the
// bottom on mount, rounds its top corners, and can be dismissed by swiping
// down or tapping the backdrop.
function QuickAddSheet({
    children,
    contentRef,
    onClose,
}: {
    children: React.ReactNode;
    contentRef: React.RefObject<HTMLElement>;
    onClose: () => void;
}) {
    const [isVisible, setIsVisible] = useState(false);
    const closingRef = useRef(false);

    const requestClose = useCallback(() => {
        if (closingRef.current) {
            return;
        }

        closingRef.current = true;
        setIsVisible(false);
        window.setTimeout(onClose, 240);
    }, [onClose]);

    const {
        dragOffset,
        isDragging,
        isSwipeDismissing,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        onTouchCancel,
    } = useSwipeToClose(requestClose, "bottom");

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => setIsVisible(true));
        return () => window.cancelAnimationFrame(frame);
    }, []);

    const dragging = isDragging || isSwipeDismissing;
    const sheetOffset = dragging
        ? `${dragOffset}px`
        : isVisible
          ? "0px"
          : "100%";

    return (
        <RemoveScroll
            allowPinchZoom
            className="fixed inset-0 z-[60] overflow-hidden"
            removeScrollBar={false}
        >
            <button
                aria-label="Close"
                className={cn(
                    "absolute inset-0 cursor-default bg-black/40 transition-opacity duration-200",
                    isVisible ? "opacity-100" : "opacity-0",
                )}
                style={
                    dragging
                        ? { opacity: Math.max(0, 1 - dragOffset / 400) }
                        : undefined
                }
                type="button"
                onClick={requestClose}
            />
            <div
                className="absolute inset-x-0 bottom-0 top-8 flex flex-col overflow-hidden rounded-t-2xl bg-white will-change-transform"
                style={{
                    transform: `translateY(${sheetOffset})`,
                    transition: isDragging
                        ? "none"
                        : "transform 240ms cubic-bezier(0.22,1,0.36,1)",
                }}
                onTouchCancel={onTouchCancel}
                onTouchEnd={onTouchEnd}
                onTouchMove={onTouchMove}
                onTouchStart={onTouchStart}
            >
                <div className="flex h-6 shrink-0 items-center justify-center">
                    <span className="h-1 w-10 rounded-full bg-neutral-300" />
                </div>
                <main
                    ref={contentRef}
                    className="flex-1 overflow-hidden"
                >
                    {children}
                </main>
            </div>
        </RemoveScroll>
    );
}

type StoredWorkspace = WorkspaceBackup;

type PendingBackupImport = {
    workspace: StoredWorkspace;
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

function getPreviousBackupStorageKey(userId: string) {
    return `kwarta:auto-backup:${userId}:prev`;
}

function readBackupRecord(key: string): AutomaticBackupRecord | null {
    try {
        const stored = window.localStorage.getItem(key);

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

function readAutomaticBackup(userId: string): AutomaticBackupRecord | null {
    return readBackupRecord(getAutomaticBackupStorageKey(userId));
}

function readPreviousBackup(userId: string): AutomaticBackupRecord | null {
    return readBackupRecord(getPreviousBackupStorageKey(userId));
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
            Object.entries(parsed).filter(
                (entry): entry is [string, string[]] => Array.isArray(entry[1]),
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
        categories.map((category) => [
            category.id,
            category.subcategories ?? [],
        ]),
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
    const [homeItemStyle, setHomeItemStyle] = useState<HomeItemStyle>("cards");
    const [budgetsEnabled, setBudgetsEnabled] = useState(true);
    const [budgetCycleSettings, setBudgetCycleSettings] =
        useState<BudgetCycleSettings>(defaultBudgetCycleSettings);
    const [budgetCycleSettingsReady, setBudgetCycleSettingsReady] =
        useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod>(() => {
        if (typeof window !== "undefined") {
            try {
                const stored = localStorage.getItem("kwarta:selectedPeriod");
                if (stored) {
                    const parsed = JSON.parse(stored) as SelectedPeriod;
                    if (
                        parsed &&
                        (parsed.frequency === "monthly" ||
                            parsed.frequency === "weekly" ||
                            parsed.frequency === "cycle") &&
                        typeof parsed.startDate === "string" &&
                        typeof parsed.endDate === "string"
                    ) {
                        return parsed;
                    }
                }
            } catch {
                // ignore corrupt storage
            }
        }
        return createMonthlyPeriod(toMonthInputValue(new Date()));
    });
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
    const [editingAccountId, setEditingAccountId] = useState<string | null>(
        null,
    );
    const [editingTransferId, setEditingTransferId] = useState<string | null>(
        null,
    );
    const [quickAddCategory, setQuickAddCategory] = useState<Category | null>(
        null,
    );
    const [helpOpen, setHelpOpen] = useState(false);
    const [helpShowIndex, setHelpShowIndex] = useState(false);
    const openHelp = (_targetView: View) => {
        setHelpShowIndex(false);
        setHelpOpen(true);
    };
    const openHelpIndex = () => {
        setHelpShowIndex(true);
        setHelpOpen(true);
    };
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
    const [previousBackup, setPreviousBackup] =
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
        if (!userId) return;
        setAutomaticBackup(readAutomaticBackup(userId));
        setPreviousBackup(readPreviousBackup(userId));
    }, [userId]);

    useEffect(() => {
        try {
            localStorage.setItem(
                "kwarta:selectedPeriod",
                JSON.stringify(selectedPeriod),
            );
        } catch {
            // ignore
        }
    }, [selectedPeriod]);

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
            allowTouchMove: (el) =>
                el instanceof HTMLElement &&
                el.closest("[data-quick-add-scroll]") !== null,
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
        const storedColorMode =
            window.localStorage.getItem("kwarta:color-mode");
        const initialColorMode: ColorMode =
            storedColorMode === "dark"
                ? "dark"
                : storedColorMode === "system"
                  ? "system"
                  : "light";

        const systemPrefersDark = window.matchMedia(
            "(prefers-color-scheme: dark)",
        ).matches;
        const initialIsDark =
            initialColorMode === "dark" ||
            (initialColorMode === "system" && systemPrefersDark);

        setColorMode(initialColorMode);
        document.documentElement.classList.toggle("dark", initialIsDark);
        document
            .querySelector('meta[name="theme-color"]')
            ?.setAttribute("content", initialIsDark ? "#141414" : "#FAFAFA");

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

        if (isHomeItemStyle(storedHomeItemStyle)) {
            setHomeItemStyle(storedHomeItemStyle);
        }

        const storedBudgetsEnabled = window.localStorage.getItem(
            "kwarta:budgets-enabled",
        );

        if (
            storedBudgetsEnabled === "true" ||
            storedBudgetsEnabled === "false"
        ) {
            setBudgetsEnabled(storedBudgetsEnabled === "true");
        }

        const storedBudgetCycleSettings = window.localStorage.getItem(
            "kwarta:budget-cycle-settings",
        );

        if (storedBudgetCycleSettings) {
            try {
                setBudgetCycleSettings(
                    normalizeBudgetCycleSettings(
                        JSON.parse(
                            storedBudgetCycleSettings,
                        ) as BudgetCycleSettings,
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
        if (colorMode !== "system") return;

        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = (e: MediaQueryListEvent) => {
            applyAppearanceWithoutTransition(() => {
                document.documentElement.classList.toggle("dark", e.matches);
                document
                    .querySelector('meta[name="theme-color"]')
                    ?.setAttribute(
                        "content",
                        e.matches ? "#141414" : "#FAFAFA",
                    );
            });
        };
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, [colorMode]);

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

        function applyWorkspace(workspace: StoredWorkspace) {
            // #171717 (black) has been removed from the color picker. Any
            // existing category using it migrates to blue on next save.
            const migratedCategories = workspace.categories.map((category) =>
                category.color === "#171717"
                    ? { ...category, color: "#257AC1" }
                    : category,
            );
            setCategories(
                mergeStoredCategorySubcategories(
                    withCategoryIcons(migratedCategories),
                    activeUserId,
                ),
            );
            setAccounts(workspace.accounts);
            setTransactions(workspace.transactions);
            setTransfers(workspace.transfers ?? []);
            setBudgets(workspace.budgets);
        }

        async function loadWorkspace() {
            setWorkspaceReady(false);
            const cachedWorkspace = readCachedWorkspace(activeUserId);

            try {
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

                applyWorkspace(workspace);
                writeCachedWorkspace(activeUserId, workspace);
            } catch {
                if (cancelled) {
                    return;
                }

                if (cachedWorkspace) {
                    // Offline (or the server is unreachable): fall back to the
                    // last workspace saved locally instead of wiping to seed.
                    applyWorkspace(cachedWorkspace);
                } else {
                    setCategories(seedCategories);
                    setAccounts(seedAccounts);
                    setTransactions([]);
                    setTransfers([]);
                    setBudgets([]);
                }
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

        // Mirror the live workspace locally on every change so it survives a
        // reload while offline and can be re-synced once back online.
        writeCachedWorkspace(userId, workspace);

        const today = toDateInputValue(new Date());
        const storedToday = readAutomaticBackup(userId);

        if (storedToday?.createdAt.slice(0, 10) === today) {
            // Today's backup already exists — sync state without overwriting.
            setAutomaticBackup(storedToday);
        } else {
            // New day: rotate the old today backup into the prev slot, then
            // create a fresh today snapshot from the current workspace.
            if (storedToday) {
                window.localStorage.setItem(
                    getPreviousBackupStorageKey(userId),
                    JSON.stringify(storedToday),
                );
                setPreviousBackup(storedToday);
            }
            setAutomaticBackup(
                persistAutomaticBackupLocally(userId, workspace),
            );
        }

        const timeout = window.setTimeout(() => {
            enqueueWorkspaceSave(() =>
                persistWorkspace(workspace, userId).then(() => {
                    markWorkspacePendingSync(userId, false);
                }),
            ).catch(() => {
                // Offline or the server rejected the save. Keep the local cache
                // and flag it so it is flushed when connectivity returns.
                markWorkspacePendingSync(userId, true);
            });
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

    useEffect(() => {
        if (!userId) {
            return;
        }

        const activeUserId = userId;

        function flushPendingSync() {
            if (!hasPendingWorkspaceSync(activeUserId)) {
                return;
            }

            const cachedWorkspace = readCachedWorkspace(activeUserId);

            if (!cachedWorkspace) {
                markWorkspacePendingSync(activeUserId, false);
                return;
            }

            enqueueWorkspaceSave(() =>
                persistWorkspace(cachedWorkspace, activeUserId).then(() => {
                    markWorkspacePendingSync(activeUserId, false);
                }),
            ).catch(() => {
                // Still unreachable; keep the flag and retry on the next
                // reconnect.
            });
        }

        // Retry immediately in case the app was reloaded while offline with
        // unsynced changes, then again whenever connectivity is restored.
        flushPendingSync();
        window.addEventListener("online", flushPendingSync);

        return () => {
            window.removeEventListener("online", flushPendingSync);
        };
    }, [userId, enqueueWorkspaceSave]);

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
            budgets.filter((budget) =>
                budgetMatchesPeriod(budget, selectedPeriod),
            ),
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
        ? periodBudgets.find(
              (budget) => budget.categoryId === quickAddCategory.id,
          )
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
                    budget.id === existingBudget.id
                        ? { ...budget, limit }
                        : budget,
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

    const expenseCategoryLookup = useMemo(
        () =>
            new Map(
                expenseCategories.map((category) => [category.id, category]),
            ),
        [expenseCategories],
    );

    // Last 6 calendar months ending at the selected period's month. Uses all
    // transactions (not just the current period) to reveal the trend.
    const trendData = useMemo(() => {
        const anchor = parseMonthValue(selectedMonth);
        const months = Array.from({ length: 6 }, (_, index) => {
            const date = new Date(
                anchor.getFullYear(),
                anchor.getMonth() - (5 - index),
                1,
            );
            return {
                key: toMonthInputValue(date),
                label: date.toLocaleDateString("en-US", { month: "short" }),
            };
        });
        const byMonth = new Map(
            months.map((month) => [month.key, { income: 0, expense: 0 }]),
        );

        transactions.forEach((transaction) => {
            const bucket = byMonth.get(transaction.date.slice(0, 7));

            if (!bucket) {
                return;
            }

            if (transaction.type === "income") {
                bucket.income += transaction.amount;
            } else {
                bucket.expense += transaction.amount;
            }
        });

        return months.map((month) => {
            const bucket = byMonth.get(month.key) ?? { income: 0, expense: 0 };

            return {
                month: month.label,
                income: bucket.income,
                expense: bucket.expense,
                net: bucket.income - bucket.expense,
            };
        });
    }, [selectedMonth, transactions]);

    // Spent vs limit per budgeted category, most-consumed first so anything
    // over budget floats to the top.
    const budgetVsActual = useMemo(() => {
        const budgetByCategory = new Map<string, Budget>();
        periodBudgets.forEach((budget) => {
            if (!budgetByCategory.has(budget.categoryId)) {
                budgetByCategory.set(budget.categoryId, budget);
            }
        });

        return Array.from(budgetByCategory.values())
            .map((budget) => {
                const category = expenseCategoryLookup.get(budget.categoryId);

                if (!category) {
                    return null;
                }

                const spent = periodTransactions
                    .filter(
                        (transaction) =>
                            transaction.type === "expense" &&
                            transaction.categoryId === budget.categoryId,
                    )
                    .reduce((sum, transaction) => sum + transaction.amount, 0);

                return {
                    name: category.name,
                    color: category.color,
                    spent,
                    limit: budget.limit,
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .sort(
                (a, b) =>
                    b.spent / Math.max(b.limit, 1) -
                    a.spent / Math.max(a.limit, 1),
            );
    }, [periodBudgets, periodTransactions, expenseCategoryLookup]);

    // Top expense categories this period with the equivalent preceding window
    // (same number of days immediately before) for a like-for-like comparison.
    const categoryComparison = useMemo(() => {
        const start = parseDateValue(selectedPeriod.startDate);
        const end = parseDateValue(selectedPeriod.endDate);
        const msPerDay = 86_400_000;
        const durationDays =
            Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
        const previousEnd = new Date(start.getTime() - msPerDay);
        const previousStart = new Date(
            previousEnd.getTime() - (durationDays - 1) * msPerDay,
        );
        const previousStartValue = toDateInputValue(previousStart);
        const previousEndValue = toDateInputValue(previousEnd);

        const currentByCategory = new Map<string, number>();
        periodTransactions.forEach((transaction) => {
            if (transaction.type !== "expense") {
                return;
            }

            currentByCategory.set(
                transaction.categoryId,
                (currentByCategory.get(transaction.categoryId) ?? 0) +
                    transaction.amount,
            );
        });

        const previousByCategory = new Map<string, number>();
        transactions.forEach((transaction) => {
            if (
                transaction.type !== "expense" ||
                !isInDateRange(
                    transaction.date,
                    previousStartValue,
                    previousEndValue,
                )
            ) {
                return;
            }

            previousByCategory.set(
                transaction.categoryId,
                (previousByCategory.get(transaction.categoryId) ?? 0) +
                    transaction.amount,
            );
        });

        return Array.from(currentByCategory.entries())
            .map(([categoryId, current]) => {
                const category = expenseCategoryLookup.get(categoryId);

                return {
                    name: category?.name ?? "Uncategorized",
                    color: category?.color ?? "#9CA3AF",
                    current,
                    previous: previousByCategory.get(categoryId) ?? 0,
                };
            })
            .sort((a, b) => b.current - a.current)
            .slice(0, 6);
    }, [
        selectedPeriod.startDate,
        selectedPeriod.endDate,
        periodTransactions,
        transactions,
        expenseCategoryLookup,
    ]);

    const financialHealth = useMemo(() => {
        const { income, expenses } = totals;
        const savingsRate = income > 0 ? (income - expenses) / income : null;

        const start = parseDateValue(selectedPeriod.startDate);
        const end = parseDateValue(selectedPeriod.endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const msPerDay = 86_400_000;
        const totalDays =
            Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
        const clampedNow = today < start ? start : today > end ? end : today;
        const daysElapsed =
            Math.round((clampedNow.getTime() - start.getTime()) / msPerDay) + 1;
        const avgPerDay = daysElapsed > 0 ? expenses / daysElapsed : 0;
        const projected =
            today < start
                ? null
                : today > end
                  ? expenses
                  : avgPerDay * totalDays;

        const biggestTransaction = periodTransactions
            .filter((transaction) => transaction.type === "expense")
            .reduce<Transaction | null>(
                (max, transaction) =>
                    !max || transaction.amount > max.amount ? transaction : max,
                null,
            );
        const biggest = biggestTransaction
            ? {
                  amount: biggestTransaction.amount,
                  category:
                      expenseCategoryLookup.get(biggestTransaction.categoryId)
                          ?.name ?? "Uncategorized",
              }
            : null;

        return { savingsRate, avgPerDay, projected, biggest };
    }, [
        totals,
        selectedPeriod.startDate,
        selectedPeriod.endDate,
        periodTransactions,
        expenseCategoryLookup,
    ]);

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

    function restoreFromBackupRecord(record: AutomaticBackupRecord) {
        try {
            setPendingBackupImport({
                workspace: parseWorkspaceBackupPayload(
                    record.backup,
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

    function handleAutomaticBackupDownload() {
        if (!automaticBackup) return;
        downloadWorkspaceBackupPayload(
            automaticBackup.backup,
            automaticBackup.createdAt.slice(0, 10),
        );
    }

    function handleAutomaticBackupRestore() {
        if (!automaticBackup) return;
        restoreFromBackupRecord(automaticBackup);
    }

    function handlePreviousBackupDownload() {
        if (!previousBackup) return;
        downloadWorkspaceBackupPayload(
            previousBackup.backup,
            previousBackup.createdAt.slice(0, 10),
        );
    }

    function handlePreviousBackupRestore() {
        if (!previousBackup) return;
        restoreFromBackupRecord(previousBackup);
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
                <QuickAddSheet contentRef={quickAddPageRef} onClose={closeQuickAdd}>
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
                </QuickAddSheet>
            </>
        );
    }

    return (
        <>
            {quickAddFocusBridge}
            <DesktopSidebar activeView={view} onSelect={setView} />
            <main className="min-h-screen bg-background md:pl-60">
                <header className="sticky top-0 z-30 border-b bg-white [backface-visibility:hidden] [transform:translateZ(0)]">
                    <div className="flex w-full items-center gap-3 px-4 py-3 md:px-5 md:py-4">
                        <div className="w-full max-w-[36rem] md:w-auto md:max-w-none">
                            <PeriodSelector
                                budgetCycleSettings={budgetCycleSettings}
                                value={selectedPeriod}
                                onBudgetCycleSettingsChange={
                                    updateBudgetCycleSettings
                                }
                                onChange={setSelectedPeriod}
                            />
                        </div>
                        <button
                            aria-label="Help & tips"
                            type="button"
                            onClick={() => openHelp(view)}
                            className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-muted-foreground shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hover:bg-[hsl(var(--hover-surface))] md:hover:text-foreground"
                        >
                            <FaRegLightbulb className="h-5 w-5" aria-hidden />
                        </button>
                    </div>
                </header>

                <div className="w-full px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 md:px-5 md:py-7">
                    {view === "dashboard" && (
                        <HomeView
                            budgets={periodBudgets}
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
                                    current.filter(
                                        (transaction) => transaction.id !== id,
                                    ),
                                )
                            }
                            onEdit={(transaction) =>
                                setEditingTransactionId(transaction.id)
                            }
                            accounts={accounts}
                            onSubmit={(values) => {
                                if (editingTransactionId) {
                                    setTransactions((current) =>
                                        current.map((transaction) =>
                                            transaction.id ===
                                            editingTransactionId
                                                ? {
                                                      ...transaction,
                                                      ...values,
                                                      accountId:
                                                          values.accountId ||
                                                          undefined,
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
                                        accountId:
                                            values.accountId ||
                                            getFirstAccountId(accounts),
                                        note: values.note || "",
                                        time:
                                            values.time === "00:00"
                                                ? getCurrentTimeInputValue()
                                                : normalizeTimeValue(
                                                      values.time,
                                                  ),
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
                                    current.filter(
                                        (budget) => budget.id !== id,
                                    ),
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
                            onCancelEditTransfer={() =>
                                setEditingTransferId(null)
                            }
                            onDelete={(id) => {
                                setAccounts((current) =>
                                    current.filter(
                                        (account) => account.id !== id,
                                    ),
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
                                    current.filter(
                                        (transfer) => transfer.id !== id,
                                    ),
                                );
                            }}
                            onEdit={(account) =>
                                setEditingAccountId(account.id)
                            }
                            onEditTransfer={(transfer) =>
                                setEditingTransferId(transfer.id)
                            }
                            onSubmit={(values, accountId) => {
                                if (accountId) {
                                    const updatedAccount = {
                                        ...accounts.find(
                                            (account) =>
                                                account.id === accountId,
                                        ),
                                        ...values,
                                        id: accountId,
                                    } as Account;

                                    setAccounts((current) =>
                                        current.map((account) =>
                                            account.id === accountId
                                                ? updatedAccount
                                                : account,
                                        ),
                                    );
                                    setEditingAccountId(null);

                                    if (userId) {
                                        enqueueWorkspaceSave(() =>
                                            persistAccount(
                                                updatedAccount,
                                                userId,
                                            ),
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
                        <SwipeBackArea
                            className="space-y-6"
                            onBack={() => setView("settings")}
                        >
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
                                budgetVsActual={budgetVsActual}
                                budgetsEnabled={budgetsEnabled}
                                categoryComparison={categoryComparison}
                                financialHealth={financialHealth}
                                trendData={trendData}
                            />
                        </SwipeBackArea>
                    )}

                    {view === "settings" && (
                        <SettingsView
                            accentTheme={accentTheme}
                            accountName={accountName}
                            email={user?.email ?? "Account session"}
                            backupImportError={backupImportError}
                            backupImportInputRef={backupImportInputRef}
                            automaticBackup={automaticBackup}
                            previousBackup={previousBackup}
                            budgetsEnabled={budgetsEnabled}
                            colorMode={colorMode}
                            homeItemStyle={homeItemStyle}
                            user={user}
                            onManageCategories={() =>
                                setView("manage-categories")
                            }
                            onViewReports={() => setView("reports")}
                            onOpenHelp={openHelpIndex}
                            onBudgetsEnabledChange={setBudgetsEnabled}
                            onBackupExport={() =>
                                downloadWorkspaceBackupFile(
                                    getCurrentWorkspace(),
                                )
                            }
                            onBackupImportClick={() =>
                                backupImportInputRef.current?.click()
                            }
                            onBackupImportFile={handleBackupImportFile}
                            onAutomaticBackupDownload={
                                handleAutomaticBackupDownload
                            }
                            onAutomaticBackupRestore={
                                handleAutomaticBackupRestore
                            }
                            onPreviousBackupDownload={
                                handlePreviousBackupDownload
                            }
                            onPreviousBackupRestore={
                                handlePreviousBackupRestore
                            }
                            onColorModeChange={(mode) => {
                                applyAppearanceWithoutTransition(() => {
                                    setColorMode(mode);
                                    const sysDark = window.matchMedia(
                                        "(prefers-color-scheme: dark)",
                                    ).matches;
                                    const isDark =
                                        mode === "dark" ||
                                        (mode === "system" && sysDark);
                                    document.documentElement.classList.toggle(
                                        "dark",
                                        isDark,
                                    );
                                    document
                                        .querySelector(
                                            'meta[name="theme-color"]',
                                        )
                                        ?.setAttribute(
                                            "content",
                                            isDark ? "#141414" : "#FAFAFA",
                                        );
                                    window.localStorage.setItem(
                                        "kwarta:color-mode",
                                        mode,
                                    );
                                });
                            }}
                            onAccentThemeChange={(theme) => {
                                applyAppearanceWithoutTransition(() => {
                                    setAccentTheme(theme);
                                    document.documentElement.dataset.accent =
                                        theme;
                                    window.localStorage.setItem(
                                        "kwarta:accent-theme",
                                        theme,
                                    );
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
                        <SwipeBackArea onBack={() => setView("settings")}>
                            <ManageCategoriesView
                                expenseCategories={expenseCategories}
                                incomeCategories={incomeCategories}
                                onAddCategory={() =>
                                    setHomeCategoryFormOpen(true)
                                }
                                onBack={() => setView("settings")}
                                onEditCategory={(category) =>
                                    setEditingCategoryId(category.id)
                                }
                                onManageSubcategories={() =>
                                    setSubcategoryFormOpen(true)
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
                        </SwipeBackArea>
                    )}
                </div>
                {helpOpen && (
                    <HelpPanel
                        view={view}
                        showIndex={helpShowIndex}
                        onClose={() => setHelpOpen(false)}
                    />
                )}
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
                                                budget.categoryId !==
                                                categoryId,
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
                                    (budget) =>
                                        budget.categoryId !== categoryId,
                                ),
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
