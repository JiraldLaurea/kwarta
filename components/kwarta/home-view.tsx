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
    Edit3,
    Ellipsis,
    GripVertical,
    Plus,
    Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
                        <div className="grid grid-cols-3 gap-3 sm:grid-cols-3 lg:grid-cols-4">
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
                    <DragOverlay adjustScale={false} dropAnimation={null}>
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
                `relative rounded-xl border border-border bg-white p-5 text-left transition-[border-color,box-shadow,opacity] md:hover:border-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:p-5`,
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
            <div className="mb-4 flex items-start justify-center md:justify-between gap-3">
                <div className="flex items-center gap-2">
                    <CategoryIconBadge category={category} />
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
            <p className="truncate text-center md:text-left text-sm md:text-base font-medium leading-5">
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
                                    "h-full rounded-full",
                                    total > budget.limit && "bg-destructive",
                                )}
                                style={{
                                    backgroundColor:
                                        total > budget.limit
                                            ? undefined
                                            : category.color,
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
            <div className="mt-3 flex-col md:flex-row flex md:items-end  items-center md:justify-between gap-3">
                <span className="text-sm font-medium">
                    {formatCurrency(total)}
                </span>
                {hasBudgetTracking && (
                    <span
                        className={cn(
                            "text-right text-xs leading-4 text-muted-foreground ",
                            budget &&
                                total > budget.limit &&
                                "text-destructive",
                        )}
                    >
                        {budget
                            ? total > budget.limit
                                ? `${formatCurrency(total - budget.limit)} excess`
                                : `${formatCurrency(budget.limit - total)} left`
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

export function QuickTransactionModal({
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
                <Card className="min-h-dvh rounded-none border-0 bg-white sm:min-h-0 sm:overflow-hidden sm:rounded-2xl sm:border">
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
                            <ModalBackButton onClick={onClose} />
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
                    <CardHeader className="px-6 pb-2 pt-5">
                        <ModalBackButton onClick={onClose} />
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
