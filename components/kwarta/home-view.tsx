"use client";

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
    Check,
    ChevronRight,
    Edit3,
    Ellipsis,
    GripVertical,
    Plus,
    Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
    Budget,
    Category,
    Transaction,
    TransactionType,
} from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import {
    formatMonthLabel,
    getSubcategoriesForCategory,
    handleDecimalInput,
    normalizeTransactionType,
    parseDecimalInput,
    toDateInputValue,
} from "@/lib/kwarta/helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
    CategoryIconBadge,
    DatePickerInput,
    EditModal,
    EmptyState,
    FieldError,
    ModalBackButton,
    MonthPickerInput,
} from "@/components/kwarta/shared";

export function HomeView({
    budgets,
    budgetsEnabled,
    editMode,
    expenseCategories,
    homeItemStyle,
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
    budgetsEnabled: boolean;
    editMode: boolean;
    expenseCategories: Category[];
    homeItemStyle: HomeItemStyle;
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
                budgetsEnabled={budgetsEnabled}
                editMode={editMode}
                title="Expenses"
                homeItemStyle={homeItemStyle}
                categories={expenseCategories}
                onDeleteCategory={onDeleteCategory}
                onEditCategory={onEditCategory}
                onReorderCategory={onReorderCategory}
                transactions={transactions}
                onSelectCategory={onSelectCategory}
            />
            <CategoryQuickAddSection
                budgets={budgets}
                budgetsEnabled={budgetsEnabled}
                editMode={editMode}
                title="Income"
                homeItemStyle={homeItemStyle}
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
    budgetsEnabled,
    categories,
    editMode,
    homeItemStyle,
    onDeleteCategory,
    onEditCategory,
    onReorderCategory,
    onSelectCategory,
    title,
    transactions,
}: {
    budgets: Budget[];
    budgetsEnabled: boolean;
    categories: Category[];
    editMode: boolean;
    homeItemStyle: HomeItemStyle;
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
    const usesIosStyle = homeItemStyle === "ios";
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

        if (overId && activeId !== overId) {
            onReorderCategory(
                normalizeTransactionType(categories[0]?.type ?? "expense"),
                activeId,
                overId,
            );
        }

        setActiveCategory(null);
    };

    return (
        <section>
            <h2 className="mb-3 text-lg font-medium leading-6 sm:text-xl sm:leading-7">
                {title}
            </h2>
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
                        <div
                            className={cn(
                                usesIosStyle
                                    ? "sm:grid sm:grid-cols-3 sm:gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-6 max-sm:overflow-hidden max-sm:rounded-2xl max-sm:border max-sm:border-border max-sm:bg-white max-sm:divide-y max-sm:divide-border"
                                    : "grid grid-cols-3 gap-2 sm:grid-cols-3 md:grid-cols-4 md:gap-3 lg:grid-cols-6",
                            )}
                        >
                            {categories.map((category) => (
                                <SortableCategoryCard
                                    key={category.id}
                                    category={category}
                                    disabled={!editMode}
                                    editMode={editMode}
                                    homeItemStyle={homeItemStyle}
                                    isOverlay={false}
                                    onDeleteCategory={onDeleteCategory}
                                    onEditCategory={onEditCategory}
                                    onSelectCategory={onSelectCategory}
                                    budget={budgetsByCategoryId.get(
                                        category.id,
                                    )}
                                    budgetsEnabled={budgetsEnabled}
                                    total={
                                        totalsByCategoryId.get(category.id) ?? 0
                                    }
                                />
                            ))}
                        </div>
                    </SortableContext>
                    <DragOverlay adjustScale={false} dropAnimation={null}>
                        {activeCategory ? (
                            <SortableCategoryCard
                                category={activeCategory}
                                disabled
                                editMode={editMode}
                                homeItemStyle={homeItemStyle}
                                isOverlay
                                onDeleteCategory={onDeleteCategory}
                                onEditCategory={onEditCategory}
                                onSelectCategory={onSelectCategory}
                                budget={budgetsByCategoryId.get(
                                    activeCategory.id,
                                )}
                                budgetsEnabled={budgetsEnabled}
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
    budgetsEnabled,
    category,
    disabled,
    editMode,
    homeItemStyle,
    isOverlay,
    onDeleteCategory,
    onEditCategory,
    onSelectCategory,
    total,
}: {
    budget?: Budget;
    budgetsEnabled: boolean;
    category: Category;
    disabled: boolean;
    editMode: boolean;
    homeItemStyle: HomeItemStyle;
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
        ["--category-color" as any]: category.color,
        // backgroundColor: `color-mix(in srgb, ${category.color} 7%, white)`,
        // borderColor: `color-mix(in srgb, ${category.color} 40%, white)`
    };
    const hasBudgetTracking =
        budgetsEnabled && normalizeTransactionType(category.type) === "expense";
    const usesIosStyle = homeItemStyle === "ios";
    const budgetStatus = budget
        ? total > budget.limit
            ? `${formatCurrency(total - budget.limit)} excess`
            : `${formatCurrency(budget.limit - total)} left`
        : "No budget set";
    const budgetProgressWidth = `${Math.min(
        100,
        budget && budget.limit > 0 ? (total / budget.limit) * 100 : 0,
    )}%`;

    return (
        <div
            ref={isOverlay ? undefined : setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "relative rounded-2xl border border-border bg-white p-4 text-left transition-[border-color,box-shadow,opacity] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex sm:min-h-[154px] sm:flex-col sm:items-center sm:justify-center sm:text-center md:p-5 md:hover:border-[var(--category-color)]",
                usesIosStyle
                    ? "max-sm:flex max-sm:min-h-[78px] max-sm:items-center max-sm:gap-3 max-sm:rounded-none max-sm:border-0 max-sm:px-4 max-sm:py-3"
                    : "",
                editMode &&
                    "cursor-grab touch-none select-none md:hover:border-border active:cursor-grabbing",
                isDragging && "opacity-20",
                isOverlay &&
                    "cursor-grabbing shadow-[0_22px_55px_rgba(37,99,235,0.24)]",
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
            <div
                className={cn(
                    "flex items-start gap-3",
                    usesIosStyle
                        ? "shrink-0 sm:mb-4 sm:justify-center"
                        : "mb-3 justify-center sm:mb-4",
                )}
            >
                <div className="flex items-center gap-2">
                    <CategoryIconBadge
                        category={category}
                        className={cn(
                            usesIosStyle
                                ? "h-11 w-11 sm:h-10 sm:w-10"
                                : "h-10 w-10",
                        )}
                        iconClassName={cn(
                            usesIosStyle
                                ? "h-5 w-5 sm:h-4 sm:w-4"
                                : "h-4 w-4",
                        )}
                    />
                    {editMode && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                            <GripVertical className="h-4 w-4" aria-hidden />
                            <span className="sr-only">Drag to reorder</span>
                        </span>
                    )}
                </div>

                {editMode && !isOverlay && (
                    <div className="h-8 w-8 shrink-0">
                        <CategoryCardActionMenu
                            category={category}
                            onDeleteCategory={onDeleteCategory}
                            onEditCategory={onEditCategory}
                        />
                    </div>
                )}
            </div>
            <div
                className={cn(
                    "sm:flex sm:w-full sm:flex-1 sm:flex-col sm:items-center sm:justify-center",
                    usesIosStyle && "min-w-0 flex-1 sm:min-w-0",
                )}
            >
                <div
                    className={cn(
                        usesIosStyle
                            ? "flex min-w-0 items-center justify-between gap-3 sm:block"
                            : "block",
                    )}
                >
                    <p
                        className={cn(
                            "truncate font-medium",
                            usesIosStyle
                                ? "text-sm leading-5 sm:text-center md:text-base"
                                : "text-center text-sm leading-5 md:text-base",
                        )}
                    >
                        {category.name}
                    </p>
                    {usesIosStyle && (
                        <span className="shrink-0 text-sm font-medium leading-5 sm:hidden">
                            {formatCurrency(total)}
                        </span>
                    )}
                </div>
                {usesIosStyle && hasBudgetTracking && (
                    <div className="mt-2 sm:hidden">
                        <div
                            aria-label={`${category.name} budget progress`}
                            className="h-1.5 overflow-hidden rounded-full bg-neutral-100"
                        >
                            {budget && (
                                <div
                                    className={cn(
                                        "h-full rounded-full",
                                        total > budget.limit &&
                                            "bg-destructive",
                                    )}
                                    style={{
                                        backgroundColor: category.color,
                                        width: budgetProgressWidth,
                                    }}
                                />
                            )}
                        </div>
                        <p
                            className={cn(
                                "mt-1 text-xs leading-4 text-muted-foreground",
                                budget &&
                                    total > budget.limit &&
                                    "text-destructive",
                            )}
                        >
                            {budgetStatus}
                        </p>
                    </div>
                )}
                {hasBudgetTracking && (
                    <div
                        className={cn(
                            "mt-3 w-full",
                            usesIosStyle && "hidden sm:block",
                        )}
                    >
                        <div
                            aria-label={`${category.name} budget progress`}
                            className="h-1.5 overflow-hidden rounded-full bg-neutral-100"
                        >
                            {budget && (
                                <div
                                    className={cn(
                                        "h-full rounded-full",
                                        total > budget.limit &&
                                            "bg-destructive",
                                    )}
                                    style={{
                                        backgroundColor: category.color,
                                        width: budgetProgressWidth,
                                    }}
                                />
                            )}
                        </div>
                    </div>
                )}
                <div
                    className={cn(
                        "mt-3 flex-col items-center gap-1 text-center",
                        usesIosStyle ? "hidden sm:flex" : "flex",
                    )}
                >
                    <span className="text-sm font-medium">
                        {formatCurrency(total)}
                    </span>
                    {hasBudgetTracking && (
                        <span
                            className={cn(
                                "text-center text-xs leading-4 text-muted-foreground ",
                                budget &&
                                    total > budget.limit &&
                                    "text-destructive",
                            )}
                        >
                            {budgetStatus}
                        </span>
                    )}
                </div>
            </div>
            {usesIosStyle && !editMode && (
                <ChevronRight
                    className="h-5 w-5 shrink-0 text-muted-foreground/60 sm:hidden"
                    aria-hidden
                />
            )}
        </div>
    );
}

export type HomeItemStyle = "ios" | "cards";

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
                className={cn(
                    "h-8 w-8 rounded-md border border-transparent md:hover:bg-neutral-100",
                    isOpen &&
                        "border-[#2563EB] shadow-[0_0_0_3px_rgba(37,99,235,0.18)]",
                )}
                type="button"
                variant="ghost"
                size="icon"
                onClick={(event) => {
                    event.stopPropagation();
                    if (event.detail === 0) {
                        setIsOpen((open) => !open);
                    }
                }}
                onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setIsOpen((open) => !open);
                }}
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

export function QuickTransactionModal({
    budget,
    budgetsEnabled,
    category,
    month,
    onClose,
    onSetBudget,
    onSetReusableBudget,
    onSubmit,
}: {
    budget?: Budget;
    budgetsEnabled: boolean;
    category: Category;
    month: string;
    onClose: () => void;
    onSetBudget: (limit: number) => void;
    onSetReusableBudget: (limit: number) => void;
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
    const [reuseBudget, setReuseBudget] = useState(true);
    const parsedLimit = parseDecimalInput(limit);
    const canSetBudget = Number.isFinite(parsedLimit) && parsedLimit > 0;
    const requiresBudget =
        budgetsEnabled && normalizeTransactionType(category.type) === "expense";
    const primaryInputRef = useRef<HTMLInputElement | null>(null);
    const focusPrimaryInput = useCallback(
        (input: HTMLInputElement | null) => {
            primaryInputRef.current = input;
            input?.focus({ preventScroll: true });
        },
        [],
    );

    useEffect(() => {
        if (window.innerWidth >= 640) {
            return;
        }

        const timeout = window.setTimeout(() => {
            primaryInputRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
        }, 220);

        return () => window.clearTimeout(timeout);
    }, []);

    if (requiresBudget && !budget) {
        return (
            <EditModal onClose={onClose}>
                <Card className="min-h-dvh rounded-none border-0 bg-white sm:min-h-0 sm:overflow-hidden sm:rounded-2xl sm:border">
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();

                            if (!canSetBudget) {
                                return;
                            }

                            if (reuseBudget) {
                                onSetReusableBudget(parsedLimit);
                                return;
                            }

                            onSetBudget(parsedLimit);
                        }}
                    >
                        <CardHeader className="px-6 pb-2 pt-6">
                            <ModalBackButton onClick={onClose} />
                            <div className="flex !m-0 !mb-4">
                                <CategoryIconBadge
                                    category={category}
                                    className="h-10 w-10"
                                    iconClassName="h-4 w-4"
                                />
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
                                    id="quick-budget-limit"
                                    inputMode="decimal"
                                    onInput={handleDecimalInput}
                                    pattern="[0-9]*[.]?[0-9]*"
                                    ref={focusPrimaryInput}
                                    type="text"
                                    value={limit}
                                    onChange={(event) =>
                                        setLimit(event.currentTarget.value)
                                    }
                                />
                            </FieldError>
                            <div className="mt-4">
                                <Label htmlFor="quick-reuse-budget">
                                    Reuse budget
                                </Label>
                                <div className="mt-2 flex items-center gap-3">
                                    <button
                                        aria-checked={reuseBudget}
                                        className={cn(
                                            "relative inline-block h-6 w-10 shrink-0 cursor-pointer rounded-full transition-[background,border-color] duration-150 ease-[cubic-bezier(0,0,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D99FF]/30",
                                            reuseBudget
                                                ? "bg-[#007AFF]"
                                                : "bg-neutral-300",
                                        )}
                                        id="quick-reuse-budget"
                                        role="switch"
                                        type="button"
                                        onClick={() =>
                                            setReuseBudget((value) => !value)
                                        }
                                    >
                                        <span
                                            className={cn(
                                                "pointer-events-none absolute left-0.5 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.22)] transition-[left] duration-150 ease-[cubic-bezier(0,0,0.2,1)]",
                                                reuseBudget && "left-[18px]",
                                            )}
                                        />
                                    </button>
                                    <p className="text-sm leading-5 text-muted-foreground">
                                        Reuse this same budget for succeeding
                                        months.
                                    </p>
                                </div>
                            </div>
                            <Button
                                className="mt-6 w-full sm:hidden"
                                type="submit"
                                disabled={!canSetBudget}
                            >
                                Set budget
                            </Button>
                        </CardContent>
                        <div className="hidden items-center justify-between rounded-b-2xl border-t border-border bg-neutral-50 px-5 py-4 sm:flex">
                            <Button
                                data-modal-close
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
            <Card className="min-h-dvh rounded-none border-0 bg-white sm:min-h-0 sm:overflow-visible sm:rounded-2xl sm:border">
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
                    <CardHeader className="px-6 pb-2 pt-6">
                        <ModalBackButton onClick={onClose} />
                        <div className="!m-0 !mb-4 flex items-start justify-between">
                            <CategoryIconBadge
                                category={category}
                                className="h-10 w-10"
                                iconClassName="h-4 w-4"
                            />
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
                    <CardContent className="space-y-4 px-6 pb-6 pt-0">
                        <FieldError>
                            <Label htmlFor="quick-amount">Amount</Label>
                            <Input
                                id="quick-amount"
                                inputMode="decimal"
                                onInput={handleDecimalInput}
                                pattern="[0-9]*[.]?[0-9]*"
                                ref={focusPrimaryInput}
                                type="text"
                                value={amount}
                                onChange={(event) =>
                                    setAmount(event.currentTarget.value)
                                }
                            />
                        </FieldError>
                        <div>
                            <Label htmlFor="quick-subcategory">
                                Subcategory
                            </Label>
                            <div className="mt-2">
                                <Select
                                    id="quick-subcategory"
                                    onValueChange={setSelectedSubcategory}
                                    options={subcategories.map(
                                        (subcategory) => ({
                                            label: subcategory,
                                            value: subcategory,
                                        }),
                                    )}
                                    value={selectedSubcategory}
                                />
                            </div>
                        </div>
                        <Button
                            className="mt-6 w-full sm:hidden"
                            type="submit"
                            disabled={!canSubmit}
                        >
                            <Plus className="h-4 w-4" aria-hidden />
                            Add transaction
                        </Button>
                    </CardContent>
                    <div className="hidden items-center justify-between rounded-b-2xl border-t border-border bg-neutral-50 px-5 py-4 sm:flex">
                        <Button
                            data-modal-close
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
