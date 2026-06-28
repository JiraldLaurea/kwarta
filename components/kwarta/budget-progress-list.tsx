"use client";

import { ChevronRight } from "lucide-react";
import type { Budget, Category, Transaction } from "@/lib/types";
import { cn, formatCurrency, percent } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CategoryIconBadge, EmptyState } from "@/components/kwarta/shared";

type BudgetProgressItem = {
    budget?: Budget;
    category: Category;
    isOverBudget: boolean;
    remaining: number;
    spent: number;
    usage: number;
};

export function BudgetProgressList({
    action,
    backupMenu,
    budgets,
    categories,
    onSelect,
    onSelectCategory,
    periodNoun = "monthly",
    presentation = "card",
    transactions,
}: {
    action?: React.ReactNode;
    backupMenu?: React.ReactNode;
    budgets: Budget[];
    categories: Category[];
    onSelect?: (budget: Budget) => void;
    onSelectCategory?: (category: Category, budget?: Budget) => void;
    periodNoun?: string;
    presentation?: "card" | "list";
    transactions: Transaction[];
}) {
    const items = categories.map((category): BudgetProgressItem => {
        const budget = budgets.find((item) => item.categoryId === category.id);
        const spent = transactions
            .filter(
                (transaction) => transaction.categoryId === category.id,
            )
            .reduce((sum, transaction) => sum + transaction.amount, 0);
        const remaining = budget ? budget.limit - spent : 0;

        return {
            budget,
            category,
            isOverBudget: Boolean(budget && remaining < 0),
            remaining,
            spent,
            usage: budget ? percent(spent, budget.limit) : 0,
        };
    });

    if (presentation === "list") {
        return (
            <section>
                {action && <div className="mt-4">{action}</div>}

                {items.length === 0 ? (
                    <EmptyState
                        className="mt-5 flex min-h-56 flex-col items-center justify-center rounded-md border border-dashed border-border"
                        title="No budgets yet"
                        description={`Create a ${periodNoun} budget after adding expense categories.`}
                    />
                ) : (
                    <div className="mt-5 overflow-hidden rounded-lg border border-border bg-white divide-y divide-border">
                        {items.map((item) => (
                            <BudgetListRow
                                key={item.category.id}
                                item={item}
                                onSelect={
                                    onSelectCategory ??
                                    (onSelect
                                        ? (_category, budget) => {
                                              if (budget) {
                                                  onSelect(budget);
                                              }
                                          }
                                        : undefined)
                                }
                            />
                        ))}
                    </div>
                )}
            </section>
        );
    }

    return (
        <Card className="flex h-full flex-col">
            <CardHeader>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle>Budget progress</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            {capitalizeFirst(periodNoun)} limits compared with
                            posted spend.
                        </p>
                    </div>
                    {backupMenu}
                </div>
            </CardHeader>
            <CardContent
                className={cn("space-y-4", items.length === 0 && "flex flex-1")}
            >
                {items.length === 0 ? (
                    <EmptyState
                        className="flex min-h-56 flex-1 flex-col items-center justify-center md:min-h-72"
                        title="No budgets yet"
                        description={`Create a ${periodNoun} budget after adding expense categories.`}
                    />
                ) : (
                    items.map((item) => (
                        <BudgetCardRow key={item.category.id} item={item} />
                    ))
                )}
            </CardContent>
        </Card>
    );
}

function capitalizeFirst(value: string) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function BudgetListRow({
    item,
    onSelect,
}: {
    item: BudgetProgressItem;
    onSelect?: (category: Category, budget?: Budget) => void;
}) {
    const content = <BudgetRowContent item={item} showDisclosure />;

    if (!onSelect) {
        return <div className="p-4">{content}</div>;
    }

    return (
        <button
            className="block min-h-[78px] w-full px-4 py-3 text-left transition-colors md:hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            type="button"
            onClick={() => onSelect(item.category, item.budget)}
        >
            {content}
        </button>
    );
}

function BudgetCardRow({ item }: { item: BudgetProgressItem }) {
    return (
        <div className="rounded-md border border-border bg-white p-3 md:p-4">
            <BudgetRowContent item={item} />
        </div>
    );
}

function BudgetRowContent({
    item,
    showDisclosure = false,
}: {
    item: BudgetProgressItem;
    showDisclosure?: boolean;
}) {
    const { budget, category, isOverBudget, remaining, spent, usage } = item;
    const indicatorColor = isOverBudget
        ? "#DC2626"
        : category.color;

    return (
        <div className="flex min-w-0 items-center gap-3">
            <CategoryIconBadge
                category={category}
                className="h-11 w-11 sm:h-10 sm:w-10"
                iconClassName="h-5 w-5 sm:h-4 sm:w-4"
            />
            <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-3">
                    <p className="min-w-0 flex-1 truncate text-sm font-medium leading-5">
                        {category.name}
                    </p>
                    {!budget && (
                        <p className="shrink-0 whitespace-nowrap text-sm font-medium leading-5">
                            {formatCurrency(0)}
                        </p>
                    )}
                </div>
                {budget && (
                    <div className="mt-1 flex items-center justify-between gap-3 text-xs leading-4 text-muted-foreground">
                        <span className="min-w-0 truncate">
                            {formatCurrency(spent)} of{" "}
                            {formatCurrency(budget.limit)}
                        </span>
                        <span
                            className={cn(
                                "shrink-0 whitespace-nowrap text-right",
                                isOverBudget && "text-destructive",
                            )}
                        >
                            {formatCurrency(Math.abs(remaining))}{" "}
                            {isOverBudget ? "excess" : "left"}
                        </span>
                    </div>
                )}
                <Progress
                    className="mt-2 h-1.5"
                    indicatorStyle={{ backgroundColor: indicatorColor }}
                    value={usage}
                />
                {!budget && (
                    <p className="mt-1 text-xs leading-4 text-muted-foreground">
                        No budget set
                    </p>
                )}
            </div>
            {showDisclosure && (
                <ChevronRight
                    className="h-5 w-5 shrink-0 text-muted-foreground/60"
                    aria-hidden
                />
            )}
        </div>
    );
}
