"use client";

import { Edit3, Trash2 } from "lucide-react";
import type { Budget, Category, Transaction } from "@/lib/types";
import { cn, formatCurrency, percent } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/kwarta/shared";

export function BudgetProgressList({
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
