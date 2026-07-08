"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  LuPenLine as Edit3,
  LuPlus as Plus,
  LuTrash2 as Trash2,
} from "react-icons/lu";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { transactionSchema, type TransactionFormValues } from "@/lib/schema";
import type {
    Account,
    Category,
    Transaction,
    TransactionType,
} from "@/lib/types";
import { getAccountLabel } from "@/lib/kwarta/account-providers";
import { cn, formatCurrency } from "@/lib/utils";
import {
    formatTime,
    formatTransactionGroupDate,
    getDefaultTransactionDate,
    getFirstCategoryId,
    getSubcategoriesForCategory,
    getTransactionFormValues,
    getTransactionGroupSummary,
    handleDecimalInput,
    normalizeTimeValue,
    normalizeTransactionType,
    parseDecimalInput,
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
    EmptyState,
    FieldError,
    ModalBackButton,
    TransactionIcon,
    useIsMobileViewport,
} from "@/components/kwarta/shared";
export function TransactionForm({
    accounts,
    categories,
    editing,
    month,
    onCancel,
    onDelete,
    onSubmit,
}: {
    accounts: Account[];
    categories: Category[];
    editing?: Transaction;
    month: string;
    onCancel: () => void;
    onDelete?: () => void;
    onSubmit: (values: TransactionFormValues) => void;
}) {
    const defaultAccountId = accounts[0]?.id ?? "";
    const transactionDefaults = useMemo<TransactionFormValues>(
        () => ({
            ...getTransactionFormValues(
                {
                    type: "expense",
                    amount: 0,
                    categoryId: getFirstCategoryId(categories, "expense"),
                    subcategory: "",
                    note: "",
                    date: getDefaultTransactionDate(month),
                    time: "00:00",
                },
                categories,
            ),
            accountId: defaultAccountId,
        }),
        [categories, defaultAccountId, month],
    );
    const formDefaults = useMemo<TransactionFormValues>(
        () =>
            editing
                ? {
                      ...getTransactionFormValues(
                          {
                              type: editing.type,
                              amount: editing.amount,
                              categoryId: editing.categoryId,
                              subcategory: editing.subcategory,
                              note: editing.note ?? "",
                              date: editing.date,
                              time: editing.time,
                          },
                          categories,
                      ),
                      accountId: editing.accountId ?? defaultAccountId,
                  }
                : transactionDefaults,
        [categories, defaultAccountId, editing, transactionDefaults],
    );
    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: formDefaults,
    });
    const type = normalizeTransactionType(form.watch("type") ?? "expense");
    const selectedCategoryId = form.watch("categoryId");
    const selectedSubcategory = form.watch("subcategory");
    const availableCategories = useMemo(
        () =>
            categories.filter(
                (category) => normalizeTransactionType(category.type) === type,
            ),
        [categories, type],
    );
    const selectedCategory = availableCategories.find(
        (category) => category.id === selectedCategoryId,
    );
    const subcategories = useMemo(
        () =>
            selectedCategory
                ? getSubcategoriesForCategory(selectedCategory)
                : [],
        [selectedCategory],
    );

    const isMobile = useIsMobileViewport();
    const [amountText, setAmountText] = useState(() =>
        formDefaults.amount ? String(formDefaults.amount) : "",
    );

    function handleAmountTextChange(next: string) {
        setAmountText(next);
        form.setValue("amount", parseDecimalInput(next), {
            shouldValidate: true,
        });
    }

    useEffect(() => {
        form.reset(formDefaults);
        setAmountText(formDefaults.amount ? String(formDefaults.amount) : "");
    }, [form, formDefaults]);

    useEffect(() => {
        const currentCategoryId = form.getValues("categoryId");
        const currentCategoryIsValid = availableCategories.some(
            (category) => category.id === currentCategoryId,
        );

        if (!currentCategoryIsValid) {
            const nextCategoryId = availableCategories[0]?.id ?? "";

            if (nextCategoryId !== currentCategoryId) {
                form.setValue("categoryId", nextCategoryId, {
                    shouldValidate: true,
                });
            }
        }
    }, [availableCategories, form]);

    useEffect(() => {
        const currentSubcategory = form.getValues("subcategory");

        if (
            subcategories.length > 0 &&
            !subcategories.includes(currentSubcategory)
        ) {
            form.setValue("subcategory", subcategories[0], {
                shouldValidate: true,
            });
        }
    }, [form, subcategories]);

    const isEditing = Boolean(editing);
    // Mobile editing renders as a bottom sheet with pills and an on-screen
    // keypad, matching the home quick-add form. Desktop keeps the dropdown
    // fields inside the centered modal.
    const isPage = isEditing && isMobile;
    const backButton = isPage ? null : (
        isEditing && <ModalBackButton onClick={onCancel} />
    );

    return (
        <Card
            className={cn(
                isPage
                    ? "h-full overflow-hidden rounded-none border-0 bg-white"
                    : isEditing &&
                          "min-h-dvh rounded-none border-0 bg-white sm:min-h-0 sm:overflow-visible sm:rounded-2xl sm:border",
            )}
        >
            <form
                onSubmit={form.handleSubmit((values) => {
                    onSubmit(values);
                    form.reset(transactionDefaults);
                })}
            >
                <CardHeader className={cn(isEditing && "px-6 pb-2 pt-5")}>
                    {backButton}
                    <CardTitle
                        className={cn(
                            isEditing && "text-2xl font-medium leading-8",
                        )}
                    >
                        {editing ? "Edit transaction" : "Add transaction"}
                    </CardTitle>
                    <p
                        className={cn(
                            "text-sm text-muted-foreground",
                            isEditing && "text-base leading-6",
                        )}
                    >
                        {editing
                            ? "Update this transaction's amount, subcategory, category, and date."
                            : "Record a new income or expense with its subcategory, category, and date."}
                    </p>
                </CardHeader>
                <CardContent
                    className={cn("space-y-4", isEditing && "px-6 pb-6 pt-0")}
                >
                  {isPage ? (
                    <>
                      <div>
                        <Label className="text-muted-foreground">
                          Amount
                        </Label>
                        <AmountDisplay className="mt-2" value={amountText} />
                      </div>
                      <div className="mt-4">
                        <Label className="text-muted-foreground">Type</Label>
                        <div className="mt-2 flex gap-2">
                          {(
                            [
                              { label: "Expense", value: "expense" },
                              { label: "Income", value: "income" },
                            ] as const
                          ).map((option) => {
                            const selected = type === option.value;

                            return (
                              <button
                                key={option.value}
                                type="button"
                                aria-pressed={selected}
                                className={cn(
                                  "flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-xl border px-4 text-sm font-semibold transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                                  selected
                                    ? "border-accent bg-accent text-accent-foreground"
                                    : "border-border bg-muted text-foreground",
                                )}
                                onClick={() => {
                                  const nextCategory = getFirstCategoryId(
                                    categories,
                                    option.value,
                                  );

                                  form.setValue("type", option.value, {
                                    shouldValidate: true,
                                  });
                                  form.setValue(
                                    "categoryId",
                                    nextCategory,
                                    { shouldValidate: true },
                                  );
                                }}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="mt-4">
                        <Label className="text-muted-foreground">
                          Category
                        </Label>
                        <div
                          className="-mx-6 mt-2 flex gap-2 overflow-x-auto overscroll-x-contain px-6 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                          data-quick-add-scroll
                        >
                          {availableCategories.map((category) => {
                            const selected =
                              category.id === selectedCategoryId;

                            return (
                              <button
                                key={category.id}
                                type="button"
                                aria-pressed={selected}
                                className={cn(
                                  "flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border pl-2 pr-4 text-sm font-semibold transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                                  selected
                                    ? "border-accent bg-accent text-accent-foreground"
                                    : "border-border bg-muted text-foreground",
                                )}
                                onClick={() =>
                                  form.setValue("categoryId", category.id, {
                                    shouldValidate: true,
                                  })
                                }
                              >
                                <CategoryIconBadge
                                  category={category}
                                  className="h-6 w-6"
                                  iconClassName="h-3.5 w-3.5"
                                />
                                {category.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      {subcategories.length > 0 && (
                        <div className="mt-4">
                          <Label className="text-muted-foreground">
                            Subcategory
                          </Label>
                          <div
                            className="-mx-6 mt-2 flex gap-2 overflow-x-auto overscroll-x-contain px-6 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            data-quick-add-scroll
                          >
                            {subcategories.map((subcategory) => {
                              const selected =
                                subcategory === selectedSubcategory;

                              return (
                                <button
                                  key={subcategory}
                                  type="button"
                                  aria-pressed={selected}
                                  className={cn(
                                    "flex h-10 shrink-0 items-center whitespace-nowrap rounded-xl border px-4 text-sm font-semibold transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                                    selected
                                      ? "border-accent bg-accent text-accent-foreground"
                                      : "border-border bg-muted text-foreground",
                                  )}
                                  onClick={() =>
                                    form.setValue("subcategory", subcategory, {
                                      shouldValidate: true,
                                    })
                                  }
                                >
                                  {subcategory}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {accounts.length > 0 && (
                        <div className="mt-4">
                          <Label className="text-muted-foreground">
                            Account
                          </Label>
                          <div
                            className="-mx-6 mt-2 flex gap-2 overflow-x-auto overscroll-x-contain px-6 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            data-quick-add-scroll
                          >
                            {accounts.map((account) => {
                              const selected =
                                account.id === form.watch("accountId");

                              return (
                                <button
                                  key={account.id}
                                  type="button"
                                  aria-pressed={selected}
                                  className={cn(
                                    "flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl border pl-2 pr-4 text-sm font-semibold transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                                    selected
                                      ? "border-accent bg-accent text-accent-foreground"
                                      : "border-border bg-muted text-foreground",
                                  )}
                                  onClick={() =>
                                    form.setValue("accountId", account.id, {
                                      shouldValidate: true,
                                    })
                                  }
                                >
                                  <AccountLogo
                                    account={account}
                                    className="h-6 w-6"
                                    iconClassName="h-3.5 w-3.5"
                                  />
                                  {getAccountLabel(account)}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <div className="mt-4">
                        <Label className="text-muted-foreground">Date</Label>
                        <div className="mt-2">
                          <DatePickerInput
                            value={form.watch("date")}
                            onChange={(value) =>
                              form.setValue("date", value, {
                                shouldValidate: true,
                              })
                            }
                          />
                        </div>
                      </div>
                      <AmountKeypadGrid
                        className="mt-5"
                        value={amountText}
                        onChange={handleAmountTextChange}
                      />
                      <div className="mt-5 flex items-center gap-2">
                        {onDelete && (
                          <Button
                            type="button"
                            variant="secondary"
                            className="h-14 flex-1 select-none rounded-2xl border-destructive/70 bg-white text-base font-bold text-destructive md:hover:bg-destructive/10"
                            onClick={onDelete}
                          >
                            Delete
                          </Button>
                        )}
                        <Button
                          className="h-14 flex-1 select-none rounded-2xl text-base font-bold"
                          type="submit"
                        >
                          Save changes
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                    <div className="grid grid-cols-2 gap-3">
                        <FieldError
                            message={form.formState.errors.type?.message}
                        >
                            <Label htmlFor="transaction-type">Type</Label>
                            <Select
                                id="transaction-type"
                                onValueChange={(value) => {
                                    const nextType = value as TransactionType;
                                    const nextCategory = getFirstCategoryId(
                                        categories,
                                        nextType,
                                    );

                                    form.setValue("type", nextType, {
                                        shouldValidate: true,
                                    });
                                    form.setValue("categoryId", nextCategory, {
                                        shouldValidate: true,
                                    });
                                }}
                                options={[
                                    { label: "Expense", value: "expense" },
                                    { label: "Income", value: "income" },
                                ]}
                                value={type}
                            />
                        </FieldError>
                        <FieldError
                            message={form.formState.errors.amount?.message}
                        >
                            <Label htmlFor="amount">Amount</Label>
                            <Input
                                id="amount"
                                inputMode="decimal"
                                onInput={handleDecimalInput}
                                pattern="[0-9]*[.]?[0-9]*"
                                type="text"
                                {...form.register("amount", {
                                    setValueAs: parseDecimalInput,
                                })}
                            />
                        </FieldError>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <FieldError
                            message={form.formState.errors.categoryId?.message}
                        >
                            <Label htmlFor="transaction-category">Category</Label>
                            <Select
                                disabled={availableCategories.length === 0}
                                id="transaction-category"
                                onValueChange={(value) =>
                                    form.setValue("categoryId", value, {
                                        shouldValidate: true,
                                    })
                                }
                                options={availableCategories.map((category) => ({
                                    label: category.name,
                                    value: category.id,
                                }))}
                                placeholder={`Create a ${type} category first`}
                                value={form.watch("categoryId")}
                            />
                        </FieldError>
                        <FieldError
                            message={form.formState.errors.subcategory?.message}
                        >
                            <Label htmlFor="transaction-subcategory">
                                Subcategory
                            </Label>
                            <Select
                                disabled={subcategories.length === 0}
                                id="transaction-subcategory"
                                onValueChange={(value) =>
                                    form.setValue("subcategory", value, {
                                        shouldValidate: true,
                                    })
                                }
                                options={subcategories.map((subcategory) => ({
                                    label: subcategory,
                                    value: subcategory,
                                }))}
                                value={selectedSubcategory}
                            />
                        </FieldError>
                    </div>
                    {accounts.length > 0 && (
                        <FieldError
                            message={form.formState.errors.accountId?.message}
                        >
                            <Label htmlFor="transaction-account">Account</Label>
                            <Select
                                id="transaction-account"
                                onValueChange={(value) =>
                                    form.setValue("accountId", value, {
                                        shouldValidate: true,
                                    })
                                }
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
                                value={form.watch("accountId") ?? ""}
                            />
                        </FieldError>
                    )}
                    <FieldError message={form.formState.errors.date?.message}>
                        <Label htmlFor="date">Date</Label>
                        <DatePickerInput
                            id="date"
                            value={form.watch("date")}
                            onChange={(value) =>
                                form.setValue("date", value, {
                                    shouldValidate: true,
                                })
                            }
                        />
                    </FieldError>
                    {isEditing && (
                        <div className="flex items-center gap-2 pt-2 sm:hidden">
                            {onDelete && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="flex-1 border-destructive/70 bg-white text-destructive md:hover:bg-destructive/10"
                                    onClick={onDelete}
                                >
                                    Delete
                                </Button>
                            )}
                            <Button className="flex-1" type="submit">
                                Save changes
                            </Button>
                        </div>
                    )}
                    </>
                  )}
                </CardContent>
                {!isPage && (
                    <div
                        className={cn(
                            "flex justify-end gap-2 px-4 pb-4",
                            isEditing &&
                                "hidden items-center justify-between rounded-b-2xl border-t border-border bg-neutral-50 px-5 py-4 sm:flex",
                        )}
                    >
                        {editing && (
                            <Button
                                data-modal-close
                                type="button"
                                variant="secondary"
                                onClick={onCancel}
                            >
                                Cancel
                            </Button>
                        )}
                        <div
                            className={cn(
                                "flex items-center gap-2",
                                editing && "ml-auto",
                            )}
                        >
                            {editing && onDelete && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="border-destructive/70 bg-white text-destructive md:hover:bg-destructive/10"
                                    onClick={onDelete}
                                >
                                    Delete
                                </Button>
                            )}
                            <Button type="submit">
                                {!editing && (
                                    <Plus className="h-4 w-4" aria-hidden />
                                )}
                                {editing ? "Save changes" : "Add transaction"}
                            </Button>
                        </div>
                    </div>
                )}
            </form>
        </Card>
    );
}


export function TransactionTable({
    categories,
    onEdit,
    transactions,
}: {
    categories: Category[];
    onEdit: (transaction: Transaction) => void;
    transactions: Transaction[];
}) {
    const groupedTransactions = useMemo(() => {
        const groups = new Map<string, Transaction[]>();

        transactions
            .slice()
            .sort((left, right) => {
                const dateOrder = right.date.localeCompare(left.date);

                if (dateOrder !== 0) {
                    return dateOrder;
                }

                return normalizeTimeValue(right.time).localeCompare(
                    normalizeTimeValue(left.time),
                );
            })
            .forEach((transaction) => {
                const group = groups.get(transaction.date) ?? [];
                group.push(transaction);
                groups.set(transaction.date, group);
            });

        return Array.from(groups, ([date, items]) => ({
            date,
            transactions: items,
        }));
    }, [transactions]);

    return (
        <div>
            {transactions.length === 0 ? (
                <EmptyState
                    className="flex min-h-[calc(100svh-13rem)] flex-col items-center justify-center rounded-xl border border-dashed bg-card"
                    title="No transactions yet"
                    description="Use a category card on Home to add income or expenses."
                />
            ) : (
                <>
                    <div className="space-y-3 md:hidden">
                        {groupedTransactions.map((group) => {
                            const groupTotal = getTransactionGroupSummary(
                                group.transactions,
                            );

                            return (
                                <section
                                    key={group.date}
                                    className="overflow-hidden rounded-xl border border-border bg-card"
                                >
                                    <TransactionGroupHeader
                                        date={group.date}
                                        total={groupTotal}
                                    />
                                    <div className="divide-y">
                                        {group.transactions.map(
                                            (transaction) => {
                                                const category =
                                                    categories.find(
                                                        (item) =>
                                                            item.id ===
                                                            transaction.categoryId,
                                                    );

                                                return (
                                                    <button
                                                        key={transaction.id}
                                                        className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors md:hover:bg-[hsl(var(--hover-surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                        type="button"
                                                        onClick={() =>
                                                            onEdit(transaction)
                                                        }
                                                    >
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            <TransactionIcon
                                                                category={
                                                                    category
                                                                }
                                                                type={
                                                                    transaction.type
                                                                }
                                                            />
                                                            <div className="min-w-0">
                                                                <p className="truncate font-medium leading-6">
                                                                    {
                                                                        transaction.subcategory
                                                                    }
                                                                </p>
                                                                <p className="text-sm leading-5 text-muted-foreground">
                                                                    {category?.name ??
                                                                        "Uncategorized"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0 text-right">
                                                            <p
                                                                className={cn(
                                                                    "text-sm font-medium leading-5",
                                                                    transaction.type ===
                                                                        "income"
                                                                        ? "text-[#15803D]"
                                                                        : "text-[#DC2626]",
                                                                )}
                                                            >
                                                                {transaction.type ===
                                                                "income"
                                                                    ? "+"
                                                                    : "-"}
                                                                {formatCurrency(
                                                                    transaction.amount,
                                                                )}
                                                            </p>
                                                            <p className="mt-1 text-xs leading-4 text-muted-foreground">
                                                                {formatTime(
                                                                    transaction.time,
                                                                )}
                                                            </p>
                                                        </div>
                                                    </button>
                                                );
                                            },
                                        )}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                    <div className="hidden space-y-3 md:block">
                        {groupedTransactions.map((group) => {
                            const groupTotal = getTransactionGroupSummary(
                                group.transactions,
                            );

                            return (
                                <section
                                    key={group.date}
                                    className="overflow-hidden rounded-xl border border-border bg-card"
                                >
                                    <TransactionGroupHeader
                                        date={group.date}
                                        total={groupTotal}
                                    />
                                    <div className="overflow-x-auto">
                                        <table className="w-full min-w-[680px] text-left text-sm">
                                            <thead className="border-b text-muted-foreground">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">
                                                        Subcategory
                                                    </th>
                                                    <th className="px-4 py-3 font-medium">
                                                        Category
                                                    </th>
                                                    <th className="px-4 py-3 text-right font-medium">
                                                        Amount
                                                    </th>
                                                    <th className="px-4 py-3 text-right font-medium">
                                                        Time
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {group.transactions.map(
                                                    (transaction) => {
                                                        const category =
                                                            categories.find(
                                                                (item) =>
                                                                    item.id ===
                                                                    transaction.categoryId,
                                                            );

                                                        return (
                                                            <tr
                                                                key={
                                                                    transaction.id
                                                                }
                                                                className="cursor-pointer border-b transition-colors last:border-0 md:hover:bg-[hsl(var(--hover-surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                                tabIndex={0}
                                                                onClick={() =>
                                                                    onEdit(
                                                                        transaction,
                                                                    )
                                                                }
                                                                onKeyDown={(
                                                                    event,
                                                                ) => {
                                                                    if (
                                                                        event.key ===
                                                                            "Enter" ||
                                                                        event.key ===
                                                                            " "
                                                                    ) {
                                                                        event.preventDefault();
                                                                        onEdit(
                                                                            transaction,
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <TransactionIcon
                                                                            category={
                                                                                category
                                                                            }
                                                                            type={
                                                                                transaction.type
                                                                            }
                                                                        />
                                                                        <span className="font-medium">
                                                                            {
                                                                                transaction.subcategory
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {category?.name ??
                                                                        "Uncategorized"}
                                                                </td>
                                                                <td
                                                                    className={cn(
                                                                        "px-4 py-3 text-right font-medium",
                                                                        transaction.type ===
                                                                            "income"
                                                                            ? "text-[#15803D]"
                                                                            : "text-[#DC2626]",
                                                                    )}
                                                                >
                                                                    {transaction.type ===
                                                                    "income"
                                                                        ? "+"
                                                                        : "-"}
                                                                    {formatCurrency(
                                                                        transaction.amount,
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right text-muted-foreground">
                                                                    {formatTime(
                                                                        transaction.time,
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    },
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

function TransactionGroupHeader({
    date,
    total,
}: {
    date: string;
    total: { amount: number; type: TransactionType };
}) {
    return (
        <div className="flex items-center justify-between gap-3 border-b px-3 py-2 md:px-4 md:py-3">
            <h3 className="text-sm font-medium leading-5">
                {formatTransactionGroupDate(date)}
            </h3>
            <p
                className={cn(
                    "shrink-0 text-right text-sm font-medium leading-5",
                    total.type === "income"
                        ? "text-[#15803D]"
                        : "text-[#DC2626]",
                )}
            >
                {total.type === "income" ? "+" : "-"}
                {formatCurrency(total.amount)}
            </p>
        </div>
    );
}

