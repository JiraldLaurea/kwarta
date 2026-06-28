"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { budgetSchema, type BudgetFormValues } from "@/lib/schema";
import type { Budget, Category, Transaction } from "@/lib/types";
import { cn, formatCurrency, percent } from "@/lib/utils";
import {
    createCustomPeriod,
    createMonthlyPeriod,
    createWeeklyPeriod,
    createBudgetCyclePeriod,
    formatMonthLabel,
    getAverageExpenseDayCount,
    getPeriodMonth,
    getPeriodNoun,
    handleDecimalInput,
    parseDecimalInput,
    type SelectedPeriod,
} from "@/lib/kwarta/helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BudgetProgressList } from "@/components/kwarta/budget-progress-list";
import {
    CategoryIconBadge,
    DatePickerInput,
    BudgetCyclePickerInput,
    EditModal,
    FieldError,
    ModalBackButton,
    MonthPickerInput,
    PageHeader,
    WeekPickerInput,
} from "@/components/kwarta/shared";

export function BudgetsView({
    allBudgets,
    budgets,
    budgetsEnabled,
    categories,
    editingId,
    month,
    onCancelEdit,
    onDelete,
    onEdit,
    period,
    periodLabel,
    onSubmit,
    transactions,
}: {
    allBudgets: Budget[];
    budgets: Budget[];
    budgetsEnabled: boolean;
    categories: Category[];
    editingId: string | null;
    month: string;
    periodLabel: string;
    onCancelEdit: () => void;
    onDelete: (id: string) => void;
    onEdit: (budget: Budget) => void;
    period: SelectedPeriod;
    onSubmit: (values: BudgetFormValues) => void;
    transactions: Transaction[];
}) {
    const editing = allBudgets.find((budget) => budget.id === editingId);
    const editingCategory = editing
        ? categories.find((category) => category.id === editing.categoryId)
        : undefined;
    const [addingBudgetCategory, setAddingBudgetCategory] =
        useState<Category | null>(null);
    if (!budgetsEnabled) {
        return (
            <div className="space-y-4 md:space-y-5">
                <PageHeader
                    title="Budgets"
                    description={`Set ${getPeriodNoun(period)} limits and track category spending.`}
                />
                <Card className="bg-white">
                    <CardHeader>
                        <CardTitle>Budgets are disabled</CardTitle>
                        <p className="text-sm leading-5 text-muted-foreground">
                            Turn budgets back on in Settings to set limits,
                            reuse budgets, and track remaining or excess spending.
                        </p>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4 md:space-y-5">
                <PageHeader
                    title="Budgets"
                    description={`Set ${getPeriodNoun(period)} limits and track category spending.`}
                />
                <MonthlyBudgetSummary
                    budgets={budgets}
                    categories={categories}
                    month={month}
                    periodLabel={periodLabel}
                    transactions={transactions.filter(
                        (transaction) => transaction.type === "expense",
                    )}
                />
                <BudgetProgressList
                    budgets={budgets}
                    categories={categories}
                    onSelectCategory={(category, budget) => {
                        if (budget) {
                            onEdit(budget);
                            return;
                        }

                        setAddingBudgetCategory(category);
                    }}
                    periodNoun={getPeriodNoun(period)}
                    presentation="list"
                    transactions={transactions.filter(
                        (transaction) => transaction.type === "expense",
                    )}
                />
            </div>
            {addingBudgetCategory && (
                <EditModal onClose={() => setAddingBudgetCategory(null)}>
                    <BudgetForm
                        category={addingBudgetCategory}
                        modal
                        month={month}
                        period={period}
                        onCancel={() => setAddingBudgetCategory(null)}
                        onSubmit={(values) => {
                            onSubmit(values);
                            setAddingBudgetCategory(null);
                        }}
                    />
                </EditModal>
            )}
            {editing && editingCategory && (
                <EditModal onClose={onCancelEdit}>
                    <BudgetForm
                        category={editingCategory}
                        editing={editing}
                        modal
                        month={month}
                        period={period}
                        onCancel={onCancelEdit}
                        onDelete={() => {
                            onDelete(editing.id);
                            onCancelEdit();
                        }}
                        onSubmit={onSubmit}
                    />
                </EditModal>
            )}
        </>
    );
}

function MonthlyBudgetSummary({
    budgets,
    categories,
    month,
    periodLabel,
    transactions,
}: {
    budgets: Budget[];
    categories: Category[];
    month: string;
    periodLabel: string;
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
    const averageExpensePerDay = totalSpent / getAverageExpenseDayCount(month);
    const segments = budgets
        .map((budget) => {
            const category = categories.find(
                (item) => item.id === budget.categoryId,
            );
            const spent = transactions
                .filter(
                    (transaction) =>
                        transaction.categoryId === budget.categoryId,
                )
                .reduce((sum, transaction) => sum + transaction.amount, 0);

            return category && spent > 0
                ? {
                      category,
                      spent,
                      width: percent(spent, totalBudget),
                  }
                : null;
        })
        .filter(Boolean) as Array<{
        category: Category;
        spent: number;
        width: number;
    }>;
    segments.sort((first, second) => second.spent - first.spent);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Total budget</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Spending for {periodLabel}
                </p>
            </CardHeader>
            <CardContent>
                <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="font-medium">
                            {formatCurrency(totalSpent)} spent
                        </span>
                        <span className="font-medium">
                            {formatCurrency(totalBudget)} total budget
                        </span>
                    </div>
                    <div className="h-4 overflow-hidden rounded-sm bg-neutral-100">
                        <div className="flex h-full">
                            {segments.map((segment) => (
                                <span
                                    aria-hidden
                                    className="h-full shrink-0 border-r border-white transition-all last:border-r-0"
                                    key={segment.category.id}
                                    style={{
                                        backgroundColor: segment.category.color,
                                        width: `${Math.min(segment.width, 100)}%`,
                                    }}
                                />
                            ))}
                            {isOverBudget && (
                                <span
                                    aria-hidden
                                    className="h-full shrink-0 bg-destructive transition-all"
                                    style={{
                                        width: `${Math.min(
                                            percent(
                                                Math.abs(remaining),
                                                totalBudget,
                                            ),
                                            100,
                                        )}%`,
                                    }}
                                />
                            )}
                        </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm text-muted-foreground leading-5">
                        <span>
                            ~{formatCurrency(averageExpensePerDay)} per day
                        </span>
                        <span
                            className={cn(
                                "text-right",
                                isOverBudget && "text-destructive",
                            )}
                        >
                            {formatCurrency(Math.abs(remaining))}{" "}
                            {isOverBudget ? "excess" : "left"}
                        </span>
                    </div>
                    {segments.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                            {segments.map((segment) => (
                                <span
                                    className="inline-flex items-center gap-2 text-sm leading-5"
                                    key={segment.category.id}
                                >
                                    <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{
                                            backgroundColor:
                                                segment.category.color,
                                        }}
                                    />
                                    {segment.category.name}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function BudgetForm({
    category,
    editing,
    modal = false,
    month,
    period,
    onCancel,
    onDelete,
    onSubmit,
}: {
    category: Category;
    editing?: Budget;
    modal?: boolean;
    month: string;
    period: SelectedPeriod;
    onCancel: () => void;
    onDelete?: () => void;
    onSubmit: (values: BudgetFormValues) => void;
}) {
    const formDefaults = useMemo<BudgetFormValues>(
        () => ({
            categoryId: category.id,
            frequency: editing?.frequency ?? period.frequency,
            limit: editing?.limit ?? 0,
            month: editing?.month ?? month,
            periodEnd: editing?.periodEnd ?? period.endDate,
            periodStart: editing?.periodStart ?? period.startDate,
            reuseBudget: true,
        }),
        [
            category.id,
            editing?.frequency,
            editing?.limit,
            editing?.month,
            editing?.periodEnd,
            editing?.periodStart,
            month,
            period.endDate,
            period.frequency,
            period.startDate,
        ],
    );
    const form = useForm<BudgetFormValues>({
        resolver: zodResolver(budgetSchema),
        defaultValues: formDefaults,
    });

    useEffect(() => {
        form.reset(formDefaults);
    }, [form, formDefaults]);

    const isEditing = Boolean(editing);
    const isModal = modal || isEditing;
    const reuseBudget = form.watch("reuseBudget");
    const submitLabel = editing ? "Save budget" : "Set budget";
    const periodNoun = getPeriodNoun(period);

    return (
        <Card
            className={cn(
                isModal &&
                    "min-h-dvh rounded-none border-0 bg-white sm:min-h-0 sm:overflow-visible sm:rounded-2xl sm:border",
            )}
        >
            <form
                onSubmit={form.handleSubmit((values) => {
                    onSubmit(values);
                    form.reset();
                })}
            >
                <CardHeader className={cn(isModal && "px-6 pb-2 pt-6")}>
                    {isModal && <ModalBackButton onClick={onCancel} />}
                    {isModal && (
                        <div className="!mb-4 !mt-0 flex">
                            <CategoryIconBadge
                                category={category}
                                className="h-10 w-10"
                                iconClassName="h-4 w-4"
                            />
                        </div>
                    )}
                    <CardTitle
                        className={cn(
                            isModal && "text-2xl font-medium leading-8",
                        )}
                    >
                        {editing ? "Edit budget" : "No Budget Set"}
                    </CardTitle>
                    <p
                        className={cn(
                            "text-sm text-muted-foreground",
                            isModal && "text-base leading-6",
                        )}
                    >
                        {editing
                            ? `Set a ${periodNoun} limit for ${category.name}.`
                            : `Set a limit for ${category.name} before adding transactions.`}
                    </p>
                </CardHeader>
                <CardContent
                    className={cn("space-y-4", isModal && "px-6 pb-6 pt-0")}
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
                        <FieldError
                            message={form.formState.errors.limit?.message}
                        >
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
                        <BudgetPeriodInput form={form} />
                    </div>
                    <div>
                        <Label htmlFor="reuse-budget">Reuse budget</Label>
                        <div className="mt-2 flex items-center gap-3">
                            <button
                                aria-checked={reuseBudget}
                                className={cn(
                                    "relative inline-block h-6 w-10 shrink-0 cursor-pointer rounded-full transition-[background,border-color] duration-150 ease-[cubic-bezier(0,0,0.2,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D99FF]/30",
                                    reuseBudget
                                        ? "bg-[#007AFF]"
                                        : "bg-neutral-300",
                                )}
                                id="reuse-budget"
                                role="switch"
                                type="button"
                                onClick={() =>
                                    form.setValue("reuseBudget", !reuseBudget, {
                                        shouldDirty: true,
                                        shouldValidate: true,
                                    })
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
                                Reuse this same budget for succeeding periods.
                            </p>
                        </div>
                    </div>
                    {isModal && (
                        <div className="flex items-center gap-2 pt-2 sm:hidden">
                            {editing && onDelete && (
                                <Button
                                    className="flex-1 border-red-300 bg-white text-destructive md:hover:bg-red-50"
                                    type="button"
                                    variant="secondary"
                                    onClick={onDelete}
                                >
                                    Delete
                                </Button>
                            )}
                            <Button className="flex-1" type="submit">
                                {submitLabel}
                            </Button>
                        </div>
                    )}
                </CardContent>
                <div
                    className={cn(
                        "flex justify-end gap-2 px-4 pb-4",
                        isModal &&
                            "hidden items-center justify-between rounded-b-2xl border-t border-border bg-neutral-50 px-5 py-4 sm:flex",
                    )}
                >
                    {isModal && (
                        <Button
                            data-modal-close
                            type="button"
                            variant="secondary"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                    )}
                    <div className={cn("flex gap-2", isModal && "ml-auto")}>
                        {editing && onDelete && (
                            <Button
                                className="border-red-300 bg-white text-destructive md:hover:bg-red-50"
                                type="button"
                                variant="secondary"
                                onClick={onDelete}
                            >
                                Delete
                            </Button>
                        )}
                        <Button type="submit">{submitLabel}</Button>
                    </div>
                </div>
            </form>
        </Card>
    );
}

function BudgetPeriodInput({
    form,
}: {
    form: ReturnType<typeof useForm<BudgetFormValues>>;
}) {
    const frequency = form.watch("frequency");

    function setBudgetPeriod(nextPeriod: SelectedPeriod) {
        form.setValue("frequency", nextPeriod.frequency, {
            shouldValidate: true,
        });
        form.setValue("month", getPeriodMonth(nextPeriod), {
            shouldValidate: true,
        });
        form.setValue("periodStart", nextPeriod.startDate, {
            shouldValidate: true,
        });
        form.setValue("periodEnd", nextPeriod.endDate, {
            shouldValidate: true,
        });
    }

    if (frequency === "weekly") {
        return (
            <FieldError message={form.formState.errors.periodStart?.message}>
                <Label htmlFor="budget-week">Week</Label>
                <WeekPickerInput
                    value={form.watch("periodStart")}
                    onChange={(date) => setBudgetPeriod(createWeeklyPeriod(date))}
                />
            </FieldError>
        );
    }

    if (frequency === "cycle") {
        return (
            <FieldError message={form.formState.errors.periodStart?.message}>
                <Label htmlFor="budget-cycle">Cycle</Label>
                <BudgetCyclePickerInput
                    value={form.watch("periodStart")}
                    onChange={(date) =>
                        setBudgetPeriod(createBudgetCyclePeriod(date))
                    }
                />
            </FieldError>
        );
    }

    if (frequency === "custom") {
        return (
            <FieldError message={form.formState.errors.periodStart?.message}>
                <Label htmlFor="budget-period">Period</Label>
                <div className="grid grid-cols-2 gap-2">
                    <DatePickerInput
                        ariaLabel="Select budget period start"
                        value={form.watch("periodStart")}
                        onChange={(startDate) =>
                            setBudgetPeriod(
                                createCustomPeriod(
                                    startDate,
                                    form.watch("periodEnd"),
                                ),
                            )
                        }
                    />
                    <DatePickerInput
                        ariaLabel="Select budget period end"
                        popoverAlign="right"
                        value={form.watch("periodEnd")}
                        onChange={(endDate) =>
                            setBudgetPeriod(
                                createCustomPeriod(
                                    form.watch("periodStart"),
                                    endDate,
                                ),
                            )
                        }
                    />
                </div>
            </FieldError>
        );
    }

    return (
        <FieldError message={form.formState.errors.month?.message}>
            <Label htmlFor="month">Month</Label>
            <MonthPickerInput
                id="month"
                value={form.watch("month")}
                onChange={(value) => setBudgetPeriod(createMonthlyPeriod(value))}
            />
        </FieldError>
    );
}
