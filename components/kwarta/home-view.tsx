"use client";

import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
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
  LuChevronRight as ChevronRight,
  LuPenLine as Edit3,
  LuEllipsis as Ellipsis,
  LuGripVertical as GripVertical,
  LuPlus as Plus,
  LuTags as Tags,
  LuTrash2 as Trash2,
} from "react-icons/lu";
import {
  forwardRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type {
  Account,
  Budget,
  Category,
  Transaction,
  TransactionType,
} from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { getAccountLabel } from "@/lib/kwarta/account-providers";
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
  AccountLogo,
  AmountDisplay,
  AmountKeypadGrid,
  CategoryIconBadge,
  DatePickerInput,
  EditModal,
  EmptyState,
  FieldError,
  ModalBackButton,
  PillCheckBadge,
} from "@/components/kwarta/shared";

// Layouts that stack full-width rows inside a single divided card; the rest are
// grids. Kept as a list so new list-style layouts only need adding here.
const LIST_LAYOUTS: readonly HomeItemStyle[] = ["ios", "compact", "meter"];

function isListLayout(style: HomeItemStyle) {
  return LIST_LAYOUTS.includes(style);
}

function gridLayoutClass(style: HomeItemStyle) {
  return style === "cards"
    ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
    : "grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6";
}

// Per-layout classes for the tappable category wrapper (drag target).
const CATEGORY_CARD_WRAPPER: Record<HomeItemStyle, string> = {
  ios: "flex min-h-[78px] items-center gap-3 border-0 px-4 py-3 md:hover:bg-[hsl(var(--hover-surface))]",
  compact:
    "flex min-h-[52px] items-center gap-3 border-0 px-4 py-2.5 md:hover:bg-[hsl(var(--hover-surface))]",
  meter: "block border-0 px-4 py-3 md:hover:bg-[hsl(var(--hover-surface))]",
  cards:
    "rounded-xl border border-border p-4 md:hover:bg-[hsl(var(--hover-surface))]",
  rings:
    "flex flex-col items-center gap-2 rounded-xl border border-border p-3 text-center md:hover:bg-[hsl(var(--hover-surface))]",
};

// Shared progress ring used by both the Cards and Rings home layouts, so the
// two stay visually identical: track is the category color at low opacity and
// only appears when a budget exists; the arc fills clockwise from the top.
function CategoryProgressRing({
  budget,
  category,
  total,
  size,
  strokeWidth,
  children,
}: {
  budget?: Budget;
  category: Category;
  total: number;
  size: number;
  strokeWidth: number;
  children: ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const over = budget ? total > budget.limit : false;
  const ratio = budget && budget.limit > 0 ? total / budget.limit : 0;
  const fraction = over ? 1 : Math.min(Math.max(ratio, 0), 1);

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ height: size, width: size }}
    >
      {budget && (
        <svg
          className="absolute inset-0 h-full w-full -rotate-90"
          viewBox={`0 0 ${size} ${size}`}
          aria-label={`${category.name} budget progress`}
          role="img"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={category.color}
            strokeOpacity={0.25}
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={over ? "#DC2626" : category.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fraction)}
            className="transition-all"
          />
        </svg>
      )}
      {children}
    </div>
  );
}

export function HomeView({
  budgets,
  budgetsEnabled,
  expenseCategories,
  homeItemStyle,
  incomeCategories,
  onDeleteCategory,
  onEditCategory,
  onReorderCategory,
  onSelectCategory,
  transactions,
}: {
  budgets: Budget[];
  budgetsEnabled: boolean;
  expenseCategories: Category[];
  homeItemStyle: HomeItemStyle;
  incomeCategories: Category[];
  onDeleteCategory: (category: Category) => void;
  onEditCategory: (category: Category) => void;
  onReorderCategory: (
    type: TransactionType,
    fromId: string,
    toId: string,
  ) => void;
  onSelectCategory: (category: Category) => void;
  transactions: Transaction[];
}) {
  return (
    <div
      className={cn(
        "space-y-5",
        isListLayout(homeItemStyle) &&
          "md:grid md:grid-cols-2 md:items-start md:gap-5 md:space-y-0",
      )}
    >
      <CategoryQuickAddSection
        budgets={budgets}
        budgetsEnabled={budgetsEnabled}
        editMode={false}
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
        editMode={false}
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
      <h2 className="mb-2 text-muted-foreground text-sm font-medium leading-5">
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
          <SortableContext items={categoryIds} strategy={rectSortingStrategy}>
            <div
              className={cn(
                isListLayout(homeItemStyle)
                  ? "overflow-hidden rounded-xl border border-border bg-card divide-y divide-border"
                  : gridLayoutClass(homeItemStyle),
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
                  budget={budgetsByCategoryId.get(category.id)}
                  budgetsEnabled={budgetsEnabled}
                  total={totalsByCategoryId.get(category.id) ?? 0}
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
                budget={budgetsByCategoryId.get(activeCategory.id)}
                budgetsEnabled={budgetsEnabled}
                total={totalsByCategoryId.get(activeCategory.id) ?? 0}
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
    ...(transition && {
      transition: `${transition}, background-color 150ms ease`,
    }),
    ["--category-color" as any]: category.color,
    // backgroundColor: `color-mix(in srgb, ${category.color} 7%, white)`,
    // borderColor: `color-mix(in srgb, ${category.color} 40%, white)`
  };
  const isIncome = normalizeTransactionType(category.type) === "income";
  const hasBudgetTracking = budgetsEnabled && !isIncome;
  const budgetStatus = budget
    ? total > budget.limit
      ? `${formatCurrency(total - budget.limit)} excess`
      : `${formatCurrency(budget.limit - total)} left`
    : "No budget set";
  const budgetPct =
    budget && budget.limit > 0
      ? Math.min(100, (total / budget.limit) * 100)
      : 0;
  const budgetProgressWidth = `${budgetPct}%`;
  const isOverBudget = budget ? total > budget.limit : false;
  const barColor = isOverBudget ? "#DC2626" : category.color;

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative bg-card text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        CATEGORY_CARD_WRAPPER[homeItemStyle],
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
      {homeItemStyle === "ios" && (
        <>
          <div className="shrink-0">
            <CategoryIconBadge
              category={category}
              className="h-11 w-11"
              iconClassName="h-5 w-5"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <p className="truncate text-sm font-medium leading-5">
                {category.name}
              </p>
              <span className="shrink-0 text-sm font-medium leading-5">
                {formatCurrency(total)}
              </span>
            </div>
            {hasBudgetTracking && (
              <div className="mt-2">
                <div
                  aria-label={`${category.name} budget progress`}
                  className="h-1.5 overflow-hidden rounded-full bg-muted"
                >
                  {budget && (
                    <div
                      className={cn("h-full rounded-full transition-all")}
                      style={{
                        backgroundColor: barColor,
                        width: budgetProgressWidth,
                      }}
                    />
                  )}
                </div>
                <p
                  className={cn(
                    "mt-1 text-xs leading-4 text-muted-foreground",
                    isOverBudget && "text-destructive",
                  )}
                >
                  {budgetStatus}
                </p>
              </div>
            )}
          </div>
          {!editMode && (
            <ChevronRight
              className="h-5 w-5 shrink-0 text-muted-foreground/60"
              aria-hidden
            />
          )}
        </>
      )}

      {homeItemStyle === "compact" && (
        <>
          <CategoryIconBadge
            category={category}
            className="h-9 w-9"
            iconClassName="h-4 w-4"
          />
          <p className="min-w-0 flex-1 truncate text-sm font-medium leading-5">
            {category.name}
          </p>
          <span className="shrink-0 text-sm font-medium leading-5 tabular-nums">
            {formatCurrency(total)}
          </span>
          {hasBudgetTracking && budget && (
            <div
              aria-label={`${category.name} budget progress`}
              className="h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full"
                style={{ width: budgetProgressWidth, backgroundColor: barColor }}
              />
            </div>
          )}
        </>
      )}

      {homeItemStyle === "meter" && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <CategoryIconBadge
                category={category}
                className="h-7 w-7"
                iconClassName="h-3.5 w-3.5"
              />
              <p className="truncate text-sm font-medium leading-5">
                {category.name}
              </p>
            </div>
            <span className="shrink-0 text-sm font-medium leading-5 tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
          {hasBudgetTracking ? (
            <>
              <div
                aria-label={`${category.name} budget progress`}
                className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-muted"
              >
                {budget && (
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: budgetProgressWidth,
                      backgroundColor: barColor,
                    }}
                  />
                )}
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <p
                  className={cn(
                    "text-xs leading-4 text-muted-foreground",
                    isOverBudget && "text-destructive",
                  )}
                >
                  {budgetStatus}
                </p>
                {budget && (
                  <span className="shrink-0 text-xs font-medium leading-4 tabular-nums text-muted-foreground">
                    {Math.round(budgetPct)}%
                  </span>
                )}
              </div>
            </>
          ) : isIncome ? null : (
            <p className="mt-2 text-xs leading-4 text-muted-foreground">
              No budget set
            </p>
          )}
        </>
      )}

      {homeItemStyle === "rings" && (
        <>
          <CategoryProgressRing
            budget={hasBudgetTracking ? budget : undefined}
            category={category}
            total={total}
            size={48}
            strokeWidth={3}
          >
            <CategoryIconBadge
              category={category}
              className="h-10 w-10"
              iconClassName="h-5 w-5"
            />
          </CategoryProgressRing>
          <div className="w-full min-w-0">
            <p className="truncate text-xs font-medium leading-4">
              {category.name}
            </p>
            <p className="truncate text-xs leading-4 text-muted-foreground tabular-nums">
              {formatCurrency(total)}
            </p>
          </div>
        </>
      )}

      {homeItemStyle === "cards" && (
        <>
          <div className="mb-3 flex items-start justify-between">
            <CardCategoryIcon
              category={category}
              budget={hasBudgetTracking ? budget : undefined}
              total={total}
            />
            <span className="text-sm font-semibold leading-5">
              {formatCurrency(total)}
            </span>
          </div>
          <p className="truncate text-sm font-medium leading-5">
            {category.name}
          </p>
          {!isIncome && (
            <p
              className={cn(
                "mt-1 text-xs leading-4 text-muted-foreground",
                hasBudgetTracking && isOverBudget && "text-destructive",
              )}
            >
              {hasBudgetTracking ? budgetStatus : "No budget set"}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function CardCategoryIcon({
  budget,
  category,
  total,
}: {
  budget?: Budget;
  category: Category;
  total: number;
}) {
  return (
    <CategoryProgressRing
      budget={budget}
      category={category}
      total={total}
      size={48}
      strokeWidth={3}
    >
      <CategoryIconBadge
        category={category}
        className="h-10 w-10"
        iconClassName="h-5 w-5"
      />
    </CategoryProgressRing>
  );
}

export type HomeItemStyle =
  | "ios"
  | "cards"
  | "compact"
  | "meter"
  | "rings";

const HOME_ITEM_STYLES: readonly HomeItemStyle[] = [
  "ios",
  "cards",
  "compact",
  "meter",
  "rings",
];

export function isHomeItemStyle(value: string | null): value is HomeItemStyle {
  return value !== null && (HOME_ITEM_STYLES as readonly string[]).includes(value);
}

export function ManageCategoriesView({
  expenseCategories,
  incomeCategories,
  onAddCategory,
  onBack,
  onEditCategory,
  onManageSubcategories,
  onReorderCategory,
}: {
  expenseCategories: Category[];
  incomeCategories: Category[];
  onAddCategory: () => void;
  onBack: () => void;
  onEditCategory: (category: Category) => void;
  onManageSubcategories: () => void;
  onReorderCategory: (
    type: TransactionType,
    fromId: string,
    toId: string,
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1 text-sm leading-5"
      >
        <button
          className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
          onClick={onBack}
        >
          Settings
        </button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span aria-current="page">Manage categories</span>
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-medium leading-7">Manage categories</h1>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">
            Arrange, edit, or remove your income and expense categories.
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            className="min-w-0 flex-1 sm:flex-none"
            type="button"
            variant="secondary"
            onClick={onManageSubcategories}
          >
            Manage subcategories
          </Button>
          <Button
            className="min-w-0 flex-1 sm:flex-none"
            type="button"
            onClick={onAddCategory}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add category
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-5 md:grid-cols-2">
        <ManageCategorySection
          title="Expenses"
          categories={expenseCategories}
          onEditCategory={onEditCategory}
          onReorderCategory={onReorderCategory}
        />
        <ManageCategorySection
          title="Income"
          categories={incomeCategories}
          onEditCategory={onEditCategory}
          onReorderCategory={onReorderCategory}
        />
      </div>
    </div>
  );
}

function ManageCategorySection({
  categories,
  onEditCategory,
  onReorderCategory,
  title,
}: {
  categories: Category[];
  onEditCategory: (category: Category) => void;
  onReorderCategory: (
    type: TransactionType,
    fromId: string,
    toId: string,
  ) => void;
  title: string;
}) {
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [activeCategoryWidth, setActiveCategoryWidth] = useState<number | null>(
    null,
  );
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
  const dragOverlay = (
    <DragOverlay adjustScale={false} dropAnimation={null}>
      {activeCategory ? (
        <ManageCategoryRowView
          category={activeCategory}
          isOverlay
          style={{
            width: activeCategoryWidth ?? undefined,
          }}
        />
      ) : null}
    </DragOverlay>
  );
  const shouldPortalDragOverlay =
    typeof document !== "undefined" &&
    typeof window !== "undefined" &&
    window.innerWidth >= 640;

  const handleDragStart = (event: DragStartEvent) => {
    const category = categories.find(
      (item) => item.id === String(event.active.id),
    );
    setActiveCategory(category ?? null);
    setActiveCategoryWidth(event.active.rect.current.initial?.width ?? null);
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
    setActiveCategoryWidth(null);
  };

  return (
    <section className="min-w-0">
      <h3 className="mb-2 text-sm font-medium leading-5 text-muted-foreground">
        {title}
      </h3>
      {categories.length === 0 ? (
        <EmptyState
          title={`No ${title.toLowerCase()} categories yet`}
          description="Add categories to organize your transactions."
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragCancel={() => {
            setActiveCategory(null);
            setActiveCategoryWidth(null);
          }}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={categoryIds} strategy={rectSortingStrategy}>
            <div className="min-w-0 rounded-lg border border-border bg-white">
              {categories.map((category) => (
                <SortableManageCategoryRow
                  key={category.id}
                  category={category}
                  onEditCategory={onEditCategory}
                />
              ))}
            </div>
          </SortableContext>
          {shouldPortalDragOverlay
            ? createPortal(dragOverlay, document.body)
            : dragOverlay}
        </DndContext>
      )}
    </section>
  );
}

function SortableManageCategoryRow({
  category,
  onEditCategory,
}: {
  category: Category;
  onEditCategory: (category: Category) => void;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: category.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <ManageCategoryRowView
      ref={setNodeRef}
      category={category}
      dragAttributes={attributes}
      dragListeners={listeners}
      isDragging={isDragging}
      onEditCategory={onEditCategory}
      style={style}
    />
  );
}

const ManageCategoryRowView = forwardRef<
  HTMLDivElement,
  {
    category: Category;
    dragAttributes?: DraggableAttributes;
    dragListeners?: DraggableSyntheticListeners;
    isDragging?: boolean;
    isOverlay?: boolean;
    onEditCategory?: (category: Category) => void;
    style?: CSSProperties;
  }
>(function ManageCategoryRowView(
  {
    category,
    dragAttributes,
    dragListeners,
    isDragging = false,
    isOverlay = false,
    onEditCategory,
    style,
  },
  ref,
) {
  return (
    <div
      ref={ref}
      style={style}
      role={!isOverlay && onEditCategory ? "button" : undefined}
      tabIndex={!isOverlay && onEditCategory ? 0 : undefined}
      className={cn(
        "flex min-h-[64px] items-center gap-3 border-b border-border bg-white px-3 py-2 transition-[background-color,box-shadow,opacity,transform] first:rounded-t-lg last:rounded-b-lg last:border-b-0",
        !isOverlay &&
          onEditCategory &&
          "cursor-pointer md:hover:bg-[hsl(var(--hover-surface))]",
        isDragging && "",
        isOverlay && "rounded-lg border border-border shadow-2xl",
      )}
      onClick={() => {
        if (!isOverlay) onEditCategory?.(category);
      }}
      onKeyDown={(event) => {
        if (!isOverlay && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onEditCategory?.(category);
        }
      }}
    >
      <span
        className="flex h-9 w-9 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg border border-dashed border-border bg-card text-muted-foreground active:cursor-grabbing"
        {...dragAttributes}
        {...dragListeners}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
        <span className="sr-only">Drag to reorder</span>
      </span>
      <CategoryIconBadge
        category={category}
        className="h-10 w-10"
        iconClassName="h-4 w-4"
      />
      <p className="min-w-0 flex-1 truncate text-sm font-medium leading-5">
        {category.name}
      </p>
      {!isOverlay && onEditCategory && (
        <ChevronRight
          className="h-5 w-5 shrink-0 text-muted-foreground/60"
          aria-hidden
        />
      )}
    </div>
  );
});

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
  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function updateMenuPosition() {
      const rect = buttonRef.current?.getBoundingClientRect();

      if (!rect) {
        return;
      }

      const menuWidth = 176;
      const menuHeight = 112;
      const gap = 8;
      const left = Math.min(
        Math.max(gap, rect.right - menuWidth),
        window.innerWidth - menuWidth - gap,
      );
      const opensAbove =
        rect.bottom + gap + menuHeight > window.innerHeight &&
        rect.top > menuHeight + gap;

      setMenuPosition({
        left,
        top: opensAbove
          ? Math.max(gap, rect.top - menuHeight - gap)
          : rect.bottom + gap,
      });
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
    }

    updateMenuPosition();
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen]);

  return (
    <div className="relative z-20">
      <Button
        ref={buttonRef}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className={cn(
          "h-8 w-8 rounded-lg border border-transparent md:hover:bg-[hsl(var(--hover-surface))]",
          isOpen && "border-ring ring-2 ring-ring/20",
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
      {isOpen &&
        menuPosition &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[90] w-44 overflow-hidden rounded-lg border border-border bg-white p-2 shadow-[0_18px_50px_rgba(0,0,0,0.12)]"
            role="menu"
            style={{
              left: menuPosition.left,
              top: menuPosition.top,
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-sm leading-5 md:hover:bg-[hsl(var(--hover-surface))]"
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
              className="flex h-10 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-sm leading-5 text-destructive md:hover:bg-destructive/10"
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
          </div>,
          document.body,
        )}
    </div>
  );
}

export function QuickTransactionModal({
  accounts,
  budget,
  budgetsEnabled,
  category,
  defaultDate,
  mobileFocusBridgeRef,
  month,
  onClose,
  periodLabel,
  periodNoun = "period",
  presentation = "modal",
  onSetBudget,
  onSetReusableBudget,
  onSubmit,
}: {
  accounts: Account[];
  budget?: Budget;
  budgetsEnabled: boolean;
  category: Category;
  defaultDate?: string;
  mobileFocusBridgeRef?: RefObject<HTMLInputElement>;
  month: string;
  onClose: () => void;
  periodLabel?: string;
  periodNoun?: string;
  presentation?: "modal" | "page";
  onSetBudget: (limit: number) => void;
  onSetReusableBudget: (limit: number) => void;
  onSubmit: (values: {
    amount: number;
    accountId?: string;
    date: string;
    subcategory: string;
  }) => void;
}) {
  const subcategories = getSubcategoriesForCategory(category);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(defaultDate ?? toDateInputValue(new Date()));
  const [selectedSubcategory, setSelectedSubcategory] = useState(
    subcategories[0] ?? "General",
  );
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts[0]?.id ?? "",
  );
  const parsedAmount = parseDecimalInput(amount);
  const canSubmit = Number.isFinite(parsedAmount) && parsedAmount > 0;

  const [limit, setLimit] = useState("");
  const [reuseBudget, setReuseBudget] = useState(true);
  const parsedLimit = parseDecimalInput(limit);
  const canSetBudget = Number.isFinite(parsedLimit) && parsedLimit > 0;
  const requiresBudget =
    budgetsEnabled && normalizeTransactionType(category.type) === "expense";
  const isPage = presentation === "page";
  const amountInputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    if (!isPage) {
      return;
    }

    if (document.activeElement !== mobileFocusBridgeRef?.current) {
      return;
    }

    // Both the amount and budget-limit steps use the on-screen keypad
    // instead of a native input, so just dismiss the decoy's OS keyboard.
    // No need to force-scroll: no native keyboard means nothing pushes the
    // viewport, and doing so here would race the sheet's own scroll lock,
    // which hasn't captured the real position yet at this point.
    mobileFocusBridgeRef?.current?.blur();
  }, [isPage, mobileFocusBridgeRef]);
  const backButton = isPage ? null : <ModalBackButton onClick={onClose} />;

  if (requiresBudget && !budget) {
    const reuseBudgetToggle = (
      <div className="mt-4">
        <Label
          htmlFor="quick-reuse-budget"
          className={cn(isPage && "text-muted-foreground")}
        >
          Reuse budget
        </Label>
        <div className="mt-2 flex items-center gap-3">
          <button
            aria-checked={reuseBudget}
            className={cn(
              "relative inline-block h-6 w-11 shrink-0 cursor-pointer rounded-full transition-[background,border-color] duration-150 ease-[cubic-bezier(0,0,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
              reuseBudget ? "bg-accent" : "bg-neutral-300",
            )}
            id="quick-reuse-budget"
            role="switch"
            type="button"
            onClick={() => setReuseBudget((value) => !value)}
          >
            <span
              className={cn(
                "pointer-events-none absolute left-[2px] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-[left] duration-150 ease-[cubic-bezier(0,0,0.2,1)]",
                reuseBudget && "left-[22px]",
              )}
              style={{ backgroundColor: "#fff" }}
            />
          </button>
          <p className="text-sm leading-5 text-muted-foreground">
            Reuse this same budget for succeeding {periodNoun}s.
          </p>
        </div>
      </div>
    );
    const budgetForm = (
      <Card
        className={cn(
          "bg-white",
          isPage
            ? "rounded-none border-0"
            : "min-h-dvh rounded-none border-0 sm:min-h-0 sm:overflow-hidden sm:rounded-2xl sm:border",
        )}
      >
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
          <CardHeader
            className={cn("px-6 pb-2 pt-6", isPage && "pt-4")}
          >
            {backButton}
            <div
              className={cn("flex !m-0 !mb-4", isPage && "!mb-3")}
            >
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
              Set a limit for {category.name} before adding transactions.
            </p>
          </CardHeader>
          <CardContent className={cn("px-6 pb-6 pt-0", isPage && "pb-5")}>
            {isPage ? (
              <>
                <div>
                  <Label className="text-muted-foreground">Limit</Label>
                  <AmountDisplay className="mt-2" value={limit} />
                </div>
                {reuseBudgetToggle}
                <AmountKeypadGrid
                  className="mt-4"
                  value={limit}
                  onChange={setLimit}
                />
                <Button
                  className={cn(
                    "mt-4 h-14 w-full select-none rounded-2xl text-base font-bold disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100",
                    canSetBudget &&
                      "bg-accent text-accent-foreground md:hover:bg-accent",
                  )}
                  type="submit"
                  disabled={!canSetBudget}
                >
                  Set budget
                </Button>
              </>
            ) : (
              <>
                <FieldError>
                  <Label htmlFor="quick-budget-limit">Limit</Label>
                  <Input
                    id="quick-budget-limit"
                    autoFocus
                    inputMode="decimal"
                    onInput={handleDecimalInput}
                    pattern="[0-9]*[.]?[0-9]*"
                    type="text"
                    value={limit}
                    onChange={(event) => setLimit(event.currentTarget.value)}
                  />
                </FieldError>
                {reuseBudgetToggle}
                <Button
                  className="mt-6 w-full sm:hidden"
                  type="submit"
                  disabled={!canSetBudget}
                >
                  Set budget
                </Button>
              </>
            )}
          </CardContent>
          {!isPage && (
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
          )}
        </form>
      </Card>
    );

    if (isPage) {
      return budgetForm;
    }

    return (
      <EditModal
        animateMobileEnter={false}
        mobileMotion="right"
        onClose={onClose}
      >
        {budgetForm}
      </EditModal>
    );
  }

  const transactionForm = (
    <Card
      className={cn(
        "bg-white",
        isPage
          ? "rounded-none border-0"
          : "min-h-dvh rounded-none border-0 sm:min-h-0 sm:overflow-visible sm:rounded-2xl sm:border",
      )}
    >
      <form
        className="select-none"
        onSubmit={(event) => {
          event.preventDefault();

          if (!canSubmit) {
            return;
          }

          onSubmit({
            amount: parsedAmount,
            accountId: selectedAccountId || undefined,
            date,
            subcategory: selectedSubcategory,
          });
        }}
      >
        <CardHeader
          className={cn("px-6 pb-2 pt-6", isPage && "pt-4")}
        >
          {backButton}
          <div
            className={cn(
              "!m-0 !mb-4 flex items-start justify-between",
              isPage && "!mb-3",
            )}
          >
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
            {periodLabel ?? formatMonthLabel(month)}.
          </p>
        </CardHeader>
        <CardContent className={cn("px-6 pb-6 pt-0", isPage && "pb-5")}>
          {isPage ? (
            <>
              <div>
                <Label className="text-muted-foreground">Subcategory</Label>
                <div
                  className="-mx-6 mt-2 flex gap-2 overflow-x-auto overscroll-x-contain px-6 pb-1 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  data-quick-add-scroll
                >
                  {subcategories.map((subcategory) => {
                    const selected = subcategory === selectedSubcategory;

                    return (
                      <button
                        key={subcategory}
                        type="button"
                        aria-pressed={selected}
                        className={cn(
                          "relative flex h-10 shrink-0 items-center whitespace-nowrap rounded-full border bg-muted px-4 text-sm font-semibold text-foreground transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                          selected
                            ? "border-accent ring-1 ring-accent"
                            : "border-border",
                        )}
                        onClick={() => setSelectedSubcategory(subcategory)}
                      >
                        {subcategory}
                        {selected && <PillCheckBadge />}
                      </button>
                    );
                  })}
                </div>
              </div>
              {accounts.length > 0 && (
                <div className="mt-3">
                  <Label className="text-muted-foreground">Account</Label>
                  <div
                    className="-mx-6 mt-2 flex gap-2 overflow-x-auto overscroll-x-contain px-6 pb-1 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    data-quick-add-scroll
                  >
                    {accounts.map((account) => {
                      const selected = account.id === selectedAccountId;

                      return (
                        <button
                          key={account.id}
                          type="button"
                          aria-pressed={selected}
                          className={cn(
                            "relative flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border bg-muted pl-2 pr-4 text-sm font-semibold text-foreground transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                            selected
                              ? "border-accent ring-1 ring-accent"
                              : "border-border",
                          )}
                          onClick={() => setSelectedAccountId(account.id)}
                        >
                          <AccountLogo
                            account={account}
                            className="h-6 w-6"
                            iconClassName="h-3.5 w-3.5"
                          />
                          {getAccountLabel(account)}
                          {selected && <PillCheckBadge />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="mt-3">
                <Label className="text-muted-foreground">Amount</Label>
                <AmountDisplay className="mt-2" value={amount} />
              </div>
              <AmountKeypadGrid
                className="mt-4"
                value={amount}
                onChange={setAmount}
              />
            </>
          ) : (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-3">
                <FieldError>
                  <Label htmlFor="quick-amount">Amount</Label>
                  <Input
                    id="quick-amount"
                    autoFocus
                    inputMode="decimal"
                    onInput={handleDecimalInput}
                    pattern="[0-9]*[.]?[0-9]*"
                    ref={amountInputRef}
                    type="text"
                    value={amount}
                    onChange={(event) => setAmount(event.currentTarget.value)}
                  />
                </FieldError>
                <div>
                  <Label htmlFor="quick-subcategory">Subcategory</Label>
                  <div className="mt-2">
                    <Select
                      id="quick-subcategory"
                      onValueChange={setSelectedSubcategory}
                      options={subcategories.map((subcategory) => ({
                        label: subcategory,
                        value: subcategory,
                      }))}
                      value={selectedSubcategory}
                    />
                  </div>
                </div>
              </div>
              {accounts.length > 0 && (
                <div className="mt-4">
                  <Label htmlFor="quick-account">Account</Label>
                  <div className="mt-2">
                    <Select
                      id="quick-account"
                      onValueChange={setSelectedAccountId}
                      options={accounts.map((account) => ({
                        icon: (
                          <AccountLogo
                            account={account}
                            className="h-6 w-6"
                            iconClassName="h-3.5 w-3.5"
                          />
                        ),
                        label: getAccountLabel(account),
                        value: account.id,
                      }))}
                      value={selectedAccountId}
                    />
                  </div>
                </div>
              )}
            </>
          )}
          <Button
            className={cn(
              "mt-6 w-full",
              isPage && "mt-4",
              !isPage && "sm:hidden",
              isPage &&
                "h-14 select-none rounded-2xl text-base font-bold disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100",
              isPage &&
                canSubmit &&
                "bg-accent text-accent-foreground md:hover:bg-accent",
            )}
            type="submit"
            disabled={!canSubmit}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add transaction
          </Button>
        </CardContent>
        {!isPage && (
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
        )}
      </form>
    </Card>
  );

  if (isPage) {
    return transactionForm;
  }

  return (
    <EditModal
      animateMobileEnter={false}
      mobileMotion="right"
      onClose={onClose}
    >
      {transactionForm}
    </EditModal>
  );
}
