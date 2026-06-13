"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Upload, Download } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { budgetSchema, type BudgetFormValues } from "@/lib/schema";
import type { Budget, Category, Transaction } from "@/lib/types";
import { cn, formatCurrency, percent } from "@/lib/utils";
import {
    formatMonthLabel,
    getAverageExpenseDayCount,
    handleDecimalInput,
    parseDecimalInput,
} from "@/lib/kwarta/helpers";
import {
    downloadBackupFile,
    parseBudgetBackupPayload,
} from "@/lib/kwarta/backup";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select } from "@/components/ui/select";
import { BudgetProgressList } from "@/components/kwarta/budget-progress-list";
import { EditModal, FieldError, ModalBackButton, MonthPickerInput } from "@/components/kwarta/shared";
import {
    ImportConfirmationModal,
    ImportLoadingModal,
    TransactionBackupActions,
} from "@/components/kwarta/backup-controls";
export function BudgetsView({
    allBudgets,
    budgets,
    categories,
    editingId,
    month,
    onCancelEdit,
    onDelete,
    onEdit,
    onImport,
    onSubmit,
    transactions,
}: {
    allBudgets: Budget[];
    budgets: Budget[];
    categories: Category[];
    editingId: string | null;
    month: string;
    onCancelEdit: () => void;
    onDelete: (id: string) => void;
    onEdit: (budget: Budget) => void;
    onImport: (budgets: Budget[]) => Promise<void>;
    onSubmit: (values: BudgetFormValues) => void;
    transactions: Transaction[];
}) {
    const editing = allBudgets.find((budget) => budget.id === editingId);
    const importInputRef = useRef<HTMLInputElement>(null);
    const [isAddingBudget, setIsAddingBudget] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [pendingImport, setPendingImport] = useState<Budget[] | null>(null);

    async function handleImportFile(file: File) {
        setIsImporting(true);

        try {
            const nextBudgets = parseBudgetBackupPayload(
                JSON.parse(await file.text()),
                categories,
            );

            setImportError(null);

            if (allBudgets.length > 0) {
                setPendingImport(nextBudgets);
                setIsImporting(false);
                return;
            }

            await onImport(nextBudgets);
        } catch {
            setImportError(
                "Budgets could not be imported. Check that this is a Kwarta budgets JSON backup.",
            );
        } finally {
            setIsImporting(false);
        }
    }

    async function confirmImport() {
        if (!pendingImport) {
            return;
        }

        const nextBudgets = pendingImport;
        setPendingImport(null);
        setIsImporting(true);

        try {
            await onImport(nextBudgets);
            setImportError(null);
        } catch {
            setImportError(
                "Imported budgets could not be saved. Please try importing again.",
            );
        } finally {
            setIsImporting(false);
        }
    }

    return (
        <>
            <div className="space-y-4 md:space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="text-xl font-medium leading-7">
                            Budgets
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Set monthly limits and track category spending.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                        <TransactionBackupActions
                            error={importError}
                            importInputRef={importInputRef}
                            onExport={() =>
                                downloadBackupFile(
                                    "budgets",
                                    allBudgets,
                                    categories,
                                )
                            }
                            onImportClick={() =>
                                importInputRef.current?.click()
                            }
                            onImportFile={handleImportFile}
                        />
                        <Button
                            type="button"
                            onClick={() => setIsAddingBudget(true)}
                        >
                            <Plus className="h-4 w-4" aria-hidden />
                            Add budget
                        </Button>
                    </div>
                </div>
                <MonthlyBudgetSummary
                    budgets={budgets}
                    month={month}
                    transactions={transactions.filter(
                        (transaction) => transaction.type === "expense",
                    )}
                />
                <BudgetProgressList
                    actions
                    budgets={budgets}
                    categories={categories}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    transactions={transactions.filter(
                        (transaction) => transaction.type === "expense",
                    )}
                />
            </div>
            {isAddingBudget && (
                <EditModal onClose={() => setIsAddingBudget(false)}>
                    <BudgetForm
                        categories={categories}
                        modal
                        month={month}
                        onCancel={() => setIsAddingBudget(false)}
                        onSubmit={(values) => {
                            onSubmit(values);
                            setIsAddingBudget(false);
                        }}
                    />
                </EditModal>
            )}
            {editing && (
                <EditModal onClose={onCancelEdit}>
                    <BudgetForm
                        categories={categories}
                        editing={editing}
                        modal
                        month={month}
                        onCancel={onCancelEdit}
                        onSubmit={onSubmit}
                    />
                </EditModal>
            )}
            {pendingImport && (
                <ImportConfirmationModal
                    count={pendingImport.length}
                    itemLabel="budgets"
                    onCancel={() => setPendingImport(null)}
                    onConfirm={confirmImport}
                />
            )}
            {isImporting && <ImportLoadingModal itemLabel="budgets" />}
        </>
    );
}

function MonthlyBudgetSummary({
    budgets,
    month,
    transactions,
}: {
    budgets: Budget[];
    month: string;
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Total budget</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Overall spending plan for {formatMonthLabel(month)}.
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
                    <Progress
                        indicatorClassName={cn(
                            isOverBudget && "bg-destructive",
                        )}
                        value={usage}
                    />
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
                </div>
            </CardContent>
        </Card>
    );
}

function BudgetForm({
    categories,
    editing,
    modal = false,
    month,
    onCancel,
    onSubmit,
}: {
    categories: Category[];
    editing?: Budget;
    modal?: boolean;
    month: string;
    onCancel: () => void;
    onSubmit: (values: BudgetFormValues) => void;
}) {
    const form = useForm<BudgetFormValues>({
        resolver: zodResolver(budgetSchema),
        values: {
            ...(editing ?? {
                categoryId: categories[0]?.id ?? "",
                limit: 0,
                month,
            }),
            reuseBudget: true,
        },
    });

    const isEditing = Boolean(editing);
    const isModal = modal || isEditing;
    const reuseBudget = form.watch("reuseBudget");

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
                    <CardTitle
                        className={cn(
                            isModal && "text-2xl font-medium leading-8",
                        )}
                    >
                        {editing ? "Edit budget" : "Add monthly budget"}
                    </CardTitle>
                    <p
                        className={cn(
                            "text-sm text-muted-foreground",
                            isModal && "text-base leading-6",
                        )}
                    >
                        Set limits against expense categories.
                    </p>
                </CardHeader>
                <CardContent
                    className={cn("space-y-4", isModal && "px-6 pb-6 pt-0")}
                >
                    <FieldError
                        message={form.formState.errors.categoryId?.message}
                    >
                        <Label htmlFor="budget-category">Category</Label>
                        <Select
                            disabled={categories.length === 0}
                            id="budget-category"
                            onValueChange={(value) =>
                                form.setValue("categoryId", value, {
                                    shouldValidate: true,
                                })
                            }
                            options={categories.map((category) => ({
                                label: category.name,
                                value: category.id,
                            }))}
                            placeholder="Create an expense category first"
                            value={form.watch("categoryId")}
                        />
                    </FieldError>
                    <FieldError message={form.formState.errors.limit?.message}>
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
                    <FieldError message={form.formState.errors.month?.message}>
                        <Label htmlFor="month">Month</Label>
                        <MonthPickerInput
                            id="month"
                            value={form.watch("month")}
                            onChange={(value) =>
                                form.setValue("month", value, {
                                    shouldValidate: true,
                                })
                            }
                        />
                    </FieldError>
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
                                Reuse this same budget for succeeding months.
                            </p>
                        </div>
                    </div>
                    {isModal && (
                        <Button className="mt-2 w-full sm:hidden" type="submit">
                            {editing ? "Save budget" : "Add budget"}
                        </Button>
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
                            type="button"
                            variant="secondary"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                    )}
                    <div
                        className={cn(
                            !isModal && "flex gap-2",
                            isModal && "ml-auto",
                        )}
                    >
                        <Button type="submit">
                            {!editing && (
                                <Plus className="h-4 w-4" aria-hidden />
                            )}
                            {editing ? "Save budget" : "Add budget"}
                        </Button>
                    </div>
                </div>
            </form>
        </Card>
    );
}

