"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRight, Link2, Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
    accountFormSchema,
    transferSchema,
    type AccountFormValues,
    type TransferFormValues,
} from "@/lib/schema";
import type { Account, AccountType, Transaction, Transfer } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import {
    accountTypeLabels,
    accountTypeOrder,
    formatTransactionGroupDate,
    getAccountBalance,
    getDefaultAccountIcon,
    getNetWorth,
    getDefaultTransactionDate,
    getCurrentTimeInputValue,
    handleDecimalInput,
    parseDecimalInput,
} from "@/lib/kwarta/helpers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
    AccountLogo,
    DatePickerInput,
    EditModal,
    EmptyState,
    FieldError,
    IconBadge,
    ModalBackButton,
    PageHeader,
    colorChoices,
} from "@/components/kwarta/shared";
import {
    getAccountLabel,
    getAccountProvider,
    getAccountSubtitle,
    getAccountTitle,
    getProvidersForType,
} from "@/lib/kwarta/account-providers";

// Sentinel for the "Other" option in the brand dropdown (maps to no provider).
const OTHER_PROVIDER_VALUE = "__other__";

function getDefaultProviderForType(type: AccountType) {
    return getProvidersForType(type)[0]?.key;
}

function getNormalizedAccountType(
    type?: string,
    provider?: string,
    icon?: string,
) {
    if (type === "bank" || type === "ewallet" || type === "cash") {
        return type;
    }

    const providerType = getAccountProvider(provider)?.types[0];

    if (providerType) {
        return providerType;
    }

    if (icon === getDefaultAccountIcon("bank")) {
        return "bank";
    }

    if (icon === getDefaultAccountIcon("ewallet")) {
        return "ewallet";
    }

    return "cash";
}

// Compact one-line account label (e.g. "BPI · Savings") for transfer history.
function accountLabel(account?: Account) {
    return account ? getAccountLabel(account) : "Unknown";
}

function normalizeAccount(account: Account): Account {
    const type = getNormalizedAccountType(
        account.type,
        account.provider || undefined,
        account.icon,
    );
    const provider = account.provider || undefined;

    return {
        ...account,
        type,
        provider,
        icon: provider ? account.icon : getDefaultAccountIcon(type),
    };
}

export function AccountsView({
    accounts,
    editingId,
    editingTransferId,
    month,
    onCancelEdit,
    onCancelEditTransfer,
    onDelete,
    onDeleteTransfer,
    onEdit,
    onEditTransfer,
    onSubmit,
    onSubmitTransfer,
    transactions,
    transfers,
}: {
    accounts: Account[];
    editingId: string | null;
    editingTransferId: string | null;
    month: string;
    onCancelEdit: () => void;
    onCancelEditTransfer: () => void;
    onDelete: (id: string) => void;
    onDeleteTransfer: (id: string) => void;
    onEdit: (account: Account) => void;
    onEditTransfer: (transfer: Transfer) => void;
    onSubmit: (values: AccountFormValues, accountId?: string) => void;
    onSubmitTransfer: (values: TransferFormValues) => void;
    transactions: Transaction[];
    transfers: Transfer[];
}) {
    const normalizedAccounts = accounts.map(normalizeAccount);
    const editing = normalizedAccounts.find(
        (account) => account.id === editingId,
    );
    const editingTransfer = transfers.find(
        (transfer) => transfer.id === editingTransferId,
    );
    const [isAddingAccount, setIsAddingAccount] = useState(false);
    const [isAddingTransfer, setIsAddingTransfer] = useState(false);
    const canTransfer = normalizedAccounts.length >= 2;

    const groups = accountTypeOrder
        .map((type) => ({
            type,
            accounts: normalizedAccounts.filter(
                (account) => account.type === type,
            ),
        }))
        .filter((group) => group.accounts.length > 0);

    return (
        <>
            <div className="space-y-4 md:space-y-5">
                <PageHeader
                    title="Accounts"
                    description="Track balances across your banks, e-wallets, and cash."
                    actions={
                        <div className="flex w-full gap-2 sm:w-auto">
                            <Button
                                className="min-w-0 flex-1 sm:flex-none"
                                type="button"
                                variant="secondary"
                                disabled={!canTransfer}
                                onClick={() => setIsAddingTransfer(true)}
                            >
                                <ArrowLeftRight
                                    className="h-4 w-4"
                                    aria-hidden
                                />
                                Transfer
                            </Button>
                            <Button
                                className="min-w-0 flex-1 sm:flex-none"
                                type="button"
                                onClick={() => setIsAddingAccount(true)}
                            >
                                <Plus className="h-4 w-4" aria-hidden />
                                Add account
                            </Button>
                        </div>
                    }
                />

                <NetWorthSummary
                    accounts={normalizedAccounts}
                    transactions={transactions}
                    transfers={transfers}
                />

                <ConnectAccountCard />

                {normalizedAccounts.length === 0 ? (
                    <EmptyState
                        className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-card"
                        title="No accounts yet"
                        description="Add a bank, e-wallet, or cash account to start tracking balances."
                    />
                ) : (
                    <div className="space-y-4 md:space-y-5">
                        {groups.map((group) => (
                            <section key={group.type} className="space-y-2">
                                <h2 className="px-1 text-sm font-medium leading-5 text-muted-foreground">
                                    {accountTypeLabels[group.type]}
                                </h2>
                                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                                    {group.accounts.map((account) => (
                                        <AccountCard
                                            key={account.id}
                                            account={account}
                                            balance={getAccountBalance(
                                                account,
                                                transactions,
                                                transfers,
                                            )}
                                            onSelect={() => onEdit(account)}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}

                {transfers.length > 0 && (
                    <TransferHistory
                        accounts={normalizedAccounts}
                        transfers={transfers}
                        onSelect={onEditTransfer}
                    />
                )}
            </div>
            {isAddingAccount && (
                <EditModal onClose={() => setIsAddingAccount(false)}>
                    <AccountForm
                        modal
                        onCancel={() => setIsAddingAccount(false)}
                        onSubmit={(values) => {
                            onSubmit(values);
                            setIsAddingAccount(false);
                        }}
                    />
                </EditModal>
            )}
            {editing && (
                <EditModal onClose={onCancelEdit}>
                    <AccountForm
                        canDelete={normalizedAccounts.length > 1}
                        editing={editing}
                        key={editing.id}
                        modal
                        onCancel={onCancelEdit}
                        onDelete={() => {
                            onDelete(editing.id);
                            onCancelEdit();
                        }}
                        onSubmit={(values) => onSubmit(values, editing.id)}
                    />
                </EditModal>
            )}
            {isAddingTransfer && (
                <EditModal onClose={() => setIsAddingTransfer(false)}>
                    <TransferForm
                        accounts={normalizedAccounts}
                        modal
                        month={month}
                        onCancel={() => setIsAddingTransfer(false)}
                        onSubmit={(values) => {
                            onSubmitTransfer(values);
                            setIsAddingTransfer(false);
                        }}
                    />
                </EditModal>
            )}
            {editingTransfer && (
                <EditModal onClose={onCancelEditTransfer}>
                    <TransferForm
                        accounts={normalizedAccounts}
                        editing={editingTransfer}
                        modal
                        month={month}
                        onCancel={onCancelEditTransfer}
                        onDelete={() => {
                            onDeleteTransfer(editingTransfer.id);
                            onCancelEditTransfer();
                        }}
                        onSubmit={onSubmitTransfer}
                    />
                </EditModal>
            )}
        </>
    );
}

function NetWorthSummary({
    accounts,
    transactions,
    transfers,
}: {
    accounts: Account[];
    transactions: Transaction[];
    transfers: Transfer[];
}) {
    const netWorth = getNetWorth(accounts, transactions, transfers);
    const isNegative = netWorth < 0;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Total balance</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Combined balance across {accounts.length}{" "}
                    {accounts.length === 1 ? "account" : "accounts"}.
                </p>
            </CardHeader>
            <CardContent>
                <p
                    className={cn(
                        "text-3xl font-medium leading-9",
                        isNegative && "text-destructive",
                    )}
                >
                    {formatCurrency(netWorth)}
                </p>
            </CardContent>
        </Card>
    );
}

function ConnectAccountCard() {
    return (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#0B57D0] text-white">
                    <Link2 className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-medium leading-5">
                        Connect a bank or e-wallet
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F0FE] px-2 py-0.5 text-[11px] font-medium leading-4 text-[#0B57D0]">
                            <Sparkles className="h-3 w-3" aria-hidden />
                            Coming soon
                        </span>
                    </p>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">
                        Automatic syncing for GCash, banks, and more. For now,
                        add and update accounts manually.
                    </p>
                </div>
            </div>
            <Button
                className="shrink-0"
                type="button"
                variant="secondary"
                disabled
            >
                Connect
            </Button>
        </div>
    );
}

function AccountCard({
    account,
    balance,
    onSelect,
}: {
    account: Account;
    balance: number;
    onSelect: () => void;
}) {
    const isLinked = account.syncStatus === "linked";
    const title = getAccountTitle(account);
    const subtitle = getAccountSubtitle(account);
    const secondary = subtitle || (isLinked ? "Linked" : "");

    return (
        <button
            type="button"
            onClick={onSelect}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors md:hover:bg-[hsl(var(--hover-surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <div className="flex min-w-0 items-center gap-3">
                <AccountLogo
                    account={account}
                    className="h-10 w-10"
                    iconClassName="h-5 w-5"
                />
                <div className="min-w-0">
                    <p className="truncate font-medium text-sm leading-5">
                        {title}
                    </p>
                    {secondary && (
                        <p className="mt-0.5 truncate text-xs leading-4 text-muted-foreground">
                            {secondary}
                        </p>
                    )}
                </div>
            </div>
            <p
                className={cn(
                    "shrink-0 text-right text-sm font-medium leading-5",
                    balance < 0 && "text-destructive",
                )}
            >
                {formatCurrency(balance)}
            </p>
        </button>
    );
}

const TRANSFER_PAGE_SIZE = 5;

function TransferHistory({
    accounts,
    transfers,
    onSelect,
}: {
    accounts: Account[];
    transfers: Transfer[];
    onSelect: (transfer: Transfer) => void;
}) {
    const [visibleCount, setVisibleCount] = useState(TRANSFER_PAGE_SIZE);
    const accountsById = new Map(
        accounts.map((account) => [account.id, account]),
    );
    const sortedTransfers = transfers.slice().sort((left, right) => {
        const dateOrder = right.date.localeCompare(left.date);

        if (dateOrder !== 0) {
            return dateOrder;
        }

        return right.time.localeCompare(left.time);
    });
    const visibleTransfers = sortedTransfers.slice(0, visibleCount);
    const remaining = sortedTransfers.length - visibleCount;

    return (
        <section className="space-y-2">
            <h2 className="px-1 text-sm font-medium leading-5 text-muted-foreground">
                Transfers
            </h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card divide-y">
                {visibleTransfers.map((transfer) => {
                    const fromAccount = accountsById.get(
                        transfer.fromAccountId,
                    );
                    const toAccount = accountsById.get(transfer.toAccountId);

                    return (
                        <button
                            key={transfer.id}
                            type="button"
                            onClick={() => onSelect(transfer)}
                            className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors md:hover:bg-[hsl(var(--hover-surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                                    <ArrowLeftRight
                                        className="h-4 w-4"
                                        aria-hidden
                                    />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate font-medium leading-5">
                                        {accountLabel(fromAccount)} →{" "}
                                        {accountLabel(toAccount)}
                                    </p>
                                    <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                                        {formatTransactionGroupDate(
                                            transfer.date,
                                        )}
                                        {transfer.fee > 0 &&
                                            ` · ${formatCurrency(transfer.fee)} fee`}
                                    </p>
                                </div>
                            </div>
                            <p className="shrink-0 text-right font-medium leading-5">
                                {formatCurrency(transfer.amount)}
                            </p>
                        </button>
                    );
                })}
                {remaining > 0 && (
                    <button
                        type="button"
                        className="w-full p-3 text-sm font-medium text-accent transition-colors md:hover:bg-[hsl(var(--hover-surface))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() =>
                            setVisibleCount((c) => c + TRANSFER_PAGE_SIZE)
                        }
                    >
                        Show {Math.min(remaining, TRANSFER_PAGE_SIZE)} more
                    </button>
                )}
            </div>
        </section>
    );
}

function TransferForm({
    accounts,
    editing,
    modal = false,
    month,
    onCancel,
    onDelete,
    onSubmit,
}: {
    accounts: Account[];
    editing?: Transfer;
    modal?: boolean;
    month: string;
    onCancel: () => void;
    onDelete?: () => void;
    onSubmit: (values: TransferFormValues) => void;
}) {
    const form = useForm<TransferFormValues>({
        resolver: zodResolver(transferSchema),
        values: editing
            ? {
                  fromAccountId: editing.fromAccountId,
                  toAccountId: editing.toAccountId,
                  amount: editing.amount,
                  fee: editing.fee,
                  note: editing.note ?? "",
                  date: editing.date,
                  time: editing.time,
              }
            : {
                  fromAccountId: "",
                  toAccountId: "",
                  amount: 0,
                  fee: 0,
                  note: "",
                  date: getDefaultTransactionDate(month),
                  time: "00:00",
              },
    });

    const isEditing = Boolean(editing);
    const isModal = isEditing || modal;
    const fromAccountId = form.watch("fromAccountId");
    const toAccountId = form.watch("toAccountId");

    return (
        <Card
            className={cn(
                isModal &&
                    "min-h-dvh rounded-none border-0 bg-white sm:min-h-0 sm:overflow-visible sm:rounded-2xl sm:border",
            )}
        >
            <form
                onSubmit={form.handleSubmit((values) => {
                    onSubmit({
                        ...values,
                        time:
                            values.time === "00:00"
                                ? getCurrentTimeInputValue()
                                : values.time,
                    });
                    form.reset();
                })}
            >
                <CardHeader className={cn(isModal && "px-6 pb-2 pt-5")}>
                    {isModal && <ModalBackButton onClick={onCancel} />}
                    <CardTitle
                        className={cn(
                            isModal && "text-2xl font-medium leading-8",
                        )}
                    >
                        {editing ? "Edit transfer" : "Transfer funds"}
                    </CardTitle>
                    <p
                        className={cn(
                            "text-sm text-muted-foreground",
                            isModal && "text-base leading-6",
                        )}
                    >
                        Move money between two of your accounts.
                    </p>
                </CardHeader>
                <CardContent
                    className={cn("space-y-4", isModal && "px-6 pb-6 pt-0")}
                >
                    <FieldError
                        message={form.formState.errors.fromAccountId?.message}
                    >
                        <Label htmlFor="transfer-from">From</Label>
                        <Select
                            id="transfer-from"
                            onValueChange={(value) =>
                                form.setValue("fromAccountId", value, {
                                    shouldValidate: true,
                                })
                            }
                            options={accounts
                                .filter((account) => account.id !== toAccountId)
                                .map((account) => ({
                                    icon: (
                                        <AccountLogo
                                            account={account}
                                            className="h-6 w-6"
                                            iconClassName="h-3.5 w-3.5"
                                        />
                                    ),
                                    label: accountLabel(account),
                                    value: account.id,
                                }))}
                            placeholder="Select source account"
                            value={fromAccountId}
                        />
                    </FieldError>
                    <FieldError
                        message={form.formState.errors.toAccountId?.message}
                    >
                        <Label htmlFor="transfer-to">To</Label>
                        <Select
                            id="transfer-to"
                            onValueChange={(value) =>
                                form.setValue("toAccountId", value, {
                                    shouldValidate: true,
                                })
                            }
                            options={accounts
                                .filter(
                                    (account) => account.id !== fromAccountId,
                                )
                                .map((account) => ({
                                    icon: (
                                        <AccountLogo
                                            account={account}
                                            className="h-6 w-6"
                                            iconClassName="h-3.5 w-3.5"
                                        />
                                    ),
                                    label: accountLabel(account),
                                    value: account.id,
                                }))}
                            placeholder="Select destination account"
                            value={toAccountId}
                        />
                    </FieldError>
                    <div className="grid grid-cols-2 gap-3">
                        <FieldError
                            message={form.formState.errors.amount?.message}
                        >
                            <Label htmlFor="transfer-amount">Amount</Label>
                            <Input
                                id="transfer-amount"
                                inputMode="decimal"
                                onInput={handleDecimalInput}
                                pattern="[0-9]*[.]?[0-9]*"
                                type="text"
                                {...form.register("amount", {
                                    setValueAs: parseDecimalInput,
                                })}
                            />
                        </FieldError>
                        <FieldError
                            message={form.formState.errors.fee?.message}
                        >
                            <Label htmlFor="transfer-fee">Fee (optional)</Label>
                            <Input
                                id="transfer-fee"
                                inputMode="decimal"
                                onInput={handleDecimalInput}
                                pattern="[0-9]*[.]?[0-9]*"
                                type="text"
                                {...form.register("fee", {
                                    setValueAs: parseDecimalInput,
                                })}
                            />
                        </FieldError>
                    </div>
                    <FieldError message={form.formState.errors.date?.message}>
                        <Label htmlFor="transfer-date">Date</Label>
                        <DatePickerInput
                            id="transfer-date"
                            value={form.watch("date")}
                            onChange={(value) =>
                                form.setValue("date", value, {
                                    shouldValidate: true,
                                })
                            }
                        />
                    </FieldError>
                    {isModal && (
                        <div className="flex items-center gap-2 pt-2 sm:hidden">
                            {editing && onDelete && (
                                <Button
                                    className="flex-1 border-destructive/70 bg-white text-destructive md:hover:bg-destructive/10"
                                    type="button"
                                    variant="secondary"
                                    onClick={onDelete}
                                >
                                    Delete
                                </Button>
                            )}
                            <Button className="flex-1" type="submit">
                                {editing ? "Save transfer" : "Transfer"}
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
                                className="border-destructive/70 bg-white text-destructive md:hover:bg-destructive/10"
                                type="button"
                                variant="secondary"
                                onClick={onDelete}
                            >
                                Delete
                            </Button>
                        )}
                        <Button type="submit">
                            {!editing && (
                                <ArrowLeftRight
                                    className="h-4 w-4"
                                    aria-hidden
                                />
                            )}
                            {editing ? "Save transfer" : "Transfer"}
                        </Button>
                    </div>
                </div>
            </form>
        </Card>
    );
}

function AccountForm({
    canDelete = true,
    editing,
    modal = false,
    onCancel,
    onDelete,
    onSubmit,
}: {
    canDelete?: boolean;
    editing?: Account;
    modal?: boolean;
    onCancel: () => void;
    onDelete?: () => void;
    onSubmit: (values: AccountFormValues) => void;
}) {
    const defaultAccountValues: AccountFormValues = {
        name: "",
        type: "bank",
        color: colorChoices[1],
        icon: getDefaultAccountIcon("bank"),
        openingBalance: 0,
        // Default to the first bank brand so new accounts start on the
        // logo-driven path rather than the custom-look path.
        provider: getDefaultProviderForType("bank"),
        syncStatus: "manual",
    };
    const editingType = editing
        ? getNormalizedAccountType(
              editing.type,
              editing.provider || undefined,
              editing.icon,
          )
        : undefined;

    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountFormSchema),
        defaultValues: defaultAccountValues,
        values: editing
            ? {
                  name: editing.name,
                  type: editingType ?? "cash",
                  color: editing.color,
                  icon:
                      editing.provider && editing.icon
                          ? editing.icon
                          : getDefaultAccountIcon(editingType ?? "cash"),
                  openingBalance: editing.openingBalance,
                  provider: editing.provider || undefined,
                  externalId: editing.externalId,
                  syncStatus: editing.syncStatus ?? "manual",
              }
            : undefined,
    });
    const selectedColor = form.watch("color");
    const selectedIcon = form.watch("icon");
    const watchedType = form.watch("type");
    const selectedProvider = form.watch("provider") || undefined;
    const selectedType = getNormalizedAccountType(
        watchedType,
        selectedProvider,
        selectedIcon,
    );

    const isEditing = Boolean(editing);
    const isModal = isEditing || modal;
    const providerChoices = getProvidersForType(selectedType);
    const supportsBrands = providerChoices.length > 0;
    const defaultProviderForSelectedType =
        getDefaultProviderForType(selectedType);
    const selectedProviderIsValid = providerChoices.some(
        (provider) => provider.key === selectedProvider,
    );
    const brandSelectValue =
        selectedProvider === undefined
            ? undefined
            : selectedProviderIsValid
              ? selectedProvider
              : defaultProviderForSelectedType;
    // Whether the per-account look (color + icon) needs to be chosen manually:
    // only for Cash, or for a bank/e-wallet set to "Other" (no brand).
    const usesCustomLook = !supportsBrands || !selectedProvider;
    const brandLabel = selectedType === "ewallet" ? "E-Wallet" : "Bank";

    useEffect(() => {
        if (watchedType === selectedType) {
            return;
        }

        form.setValue("type", selectedType, {
            shouldValidate: true,
        });
    }, [form, selectedType, watchedType]);

    useEffect(() => {
        if (
            !supportsBrands ||
            selectedProvider === undefined ||
            selectedProviderIsValid ||
            !defaultProviderForSelectedType
        ) {
            return;
        }

        form.setValue("provider", defaultProviderForSelectedType, {
            shouldValidate: true,
        });
    }, [
        defaultProviderForSelectedType,
        form,
        selectedProvider,
        selectedProviderIsValid,
        supportsBrands,
    ]);

    useEffect(() => {
        if (selectedProvider) {
            return;
        }

        const defaultIcon = getDefaultAccountIcon(selectedType);

        if (selectedIcon === defaultIcon) {
            return;
        }

        form.setValue("icon", defaultIcon, {
            shouldValidate: true,
        });
    }, [form, selectedIcon, selectedProvider, selectedType]);

    return (
        <Card
            className={cn(
                isModal &&
                    "min-h-dvh rounded-none border-0 bg-white sm:min-h-0 sm:overflow-visible sm:rounded-2xl sm:border",
            )}
        >
            <form
                onSubmit={form.handleSubmit((values) => {
                    const provider = values.provider || undefined;
                    onSubmit({
                        ...values,
                        provider,
                        icon: provider
                            ? values.icon
                            : getDefaultAccountIcon(values.type),
                    });
                    form.reset();
                })}
            >
                <CardHeader className={cn(isModal && "px-6 pb-2 pt-5")}>
                    {isModal && <ModalBackButton onClick={onCancel} />}
                    <CardTitle
                        className={cn(
                            isModal && "text-2xl font-medium leading-8",
                        )}
                    >
                        {editing ? "Edit account" : "Add account"}
                    </CardTitle>
                    <p
                        className={cn(
                            "text-sm text-muted-foreground",
                            isModal && "text-base leading-6",
                        )}
                    >
                        {editing
                            ? "Update this account's name, type, balance, and look."
                            : "Add a bank, e-wallet, or cash account to track its balance."}
                    </p>
                </CardHeader>
                <CardContent
                    className={cn("space-y-4", isModal && "px-6 pb-6 pt-0")}
                >
                    <div className="grid grid-cols-2 gap-3">
                        <FieldError
                            message={form.formState.errors.type?.message}
                        >
                            <Label htmlFor="account-type">Type</Label>
                            <Select
                                id="account-type"
                                onValueChange={(value) => {
                                    const nextType = value as AccountType;
                                    form.reset(
                                        {
                                            ...form.getValues(),
                                            type: nextType,
                                            icon: getDefaultAccountIcon(
                                                nextType,
                                            ),
                                            provider:
                                                getDefaultProviderForType(
                                                    nextType,
                                                ),
                                        },
                                        {
                                            keepErrors: true,
                                        },
                                    );
                                    form.trigger(["type", "provider"]);
                                }}
                                options={[
                                    { label: "Bank", value: "bank" },
                                    { label: "E-Wallet", value: "ewallet" },
                                    { label: "Cash", value: "cash" },
                                ]}
                                value={selectedType}
                            />
                        </FieldError>
                        <FieldError
                            message={
                                form.formState.errors.openingBalance?.message
                            }
                        >
                            <Label htmlFor="account-balance">
                                Current balance
                            </Label>
                            <Input
                                id="account-balance"
                                inputMode="decimal"
                                onInput={handleDecimalInput}
                                pattern="[0-9]*[.]?[0-9]*"
                                type="text"
                                {...form.register("openingBalance", {
                                    setValueAs: parseDecimalInput,
                                })}
                            />
                        </FieldError>
                    </div>
                    {supportsBrands && (
                        <FieldError>
                            <Label htmlFor="account-brand">{brandLabel}</Label>
                            <Select
                                id="account-brand"
                                onValueChange={(value) => {
                                    const nextProvider =
                                        value === OTHER_PROVIDER_VALUE
                                            ? undefined
                                            : value;

                                    form.setValue("provider", nextProvider);

                                    if (!nextProvider) {
                                        form.setValue(
                                            "icon",
                                            getDefaultAccountIcon(selectedType),
                                            {
                                                shouldValidate: true,
                                            },
                                        );
                                    }
                                }}
                                options={[
                                    ...providerChoices.map((provider) => ({
                                        icon: (
                                            <AccountLogo
                                                account={{
                                                    color: provider.color,
                                                    icon: selectedIcon,
                                                    provider: provider.key,
                                                }}
                                                className="h-6 w-6"
                                                iconClassName="h-3.5 w-3.5"
                                            />
                                        ),
                                        label: provider.label,
                                        value: provider.key,
                                    })),
                                    {
                                        icon: (
                                            <IconBadge
                                                color="#737373"
                                                icon="wallet"
                                                className="h-6 w-6"
                                                iconClassName="h-3.5 w-3.5"
                                            />
                                        ),
                                        label: `Other ${brandLabel.toLowerCase()}`,
                                        value: OTHER_PROVIDER_VALUE,
                                    },
                                ]}
                                value={brandSelectValue ?? OTHER_PROVIDER_VALUE}
                            />
                        </FieldError>
                    )}
                    <FieldError message={form.formState.errors.name?.message}>
                        <Label htmlFor="account-name">
                            {selectedProvider ? "Label (optional)" : "Name"}
                        </Label>
                        <Input
                            id="account-name"
                            placeholder={
                                selectedProvider
                                    ? "e.g. Savings, Payroll — to separate accounts"
                                    : selectedType === "cash"
                                      ? "e.g. Cash, Wallet"
                                      : "e.g. My bank"
                            }
                            {...form.register("name")}
                        />
                    </FieldError>
                    {usesCustomLook && (
                        <div>
                            <Label>Color</Label>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {colorChoices.map((color) => (
                                    <button
                                        key={color}
                                        aria-label={`Use ${color}`}
                                        className={cn(
                                            "h-8 w-8 rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                            selectedColor === color &&
                                                "ring-2 ring-ring ring-offset-2",
                                        )}
                                        style={{ backgroundColor: color }}
                                        type="button"
                                        onClick={() =>
                                            form.setValue("color", color)
                                        }
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    {isModal && (
                        <div className="flex items-center gap-2 pt-2 sm:hidden">
                            {editing && onDelete && (
                                <Button
                                    className="flex-1 border-destructive/70 bg-white text-destructive md:hover:bg-destructive/10"
                                    disabled={!canDelete}
                                    type="button"
                                    variant="secondary"
                                    onClick={onDelete}
                                >
                                    Delete
                                </Button>
                            )}
                            <Button className="flex-1" type="submit">
                                {editing ? "Save account" : "Add account"}
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
                                className="border-destructive/70 bg-white text-destructive md:hover:bg-destructive/10"
                                disabled={!canDelete}
                                type="button"
                                variant="secondary"
                                onClick={onDelete}
                            >
                                Delete
                            </Button>
                        )}
                        <Button type="submit">
                            {!editing && (
                                <Plus className="h-4 w-4" aria-hidden />
                            )}
                            {editing ? "Save account" : "Add account"}
                        </Button>
                    </div>
                </div>
            </form>
        </Card>
    );
}
