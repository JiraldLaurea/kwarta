"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeftRight, Link2, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
    accountFormSchema,
    transferSchema,
    type AccountFormValues,
    type TransferFormValues,
} from "@/lib/schema";
import type {
    Account,
    AccountType,
    Transaction,
    Transfer,
} from "@/lib/types";
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
    categoryIconChoices,
    colorChoices,
} from "@/components/kwarta/shared";
import {
    getAccountLabel,
    getAccountSubtitle,
    getAccountTitle,
    getProvidersForType,
} from "@/lib/kwarta/account-providers";

// Sentinel for the "Other" option in the brand dropdown (maps to no provider).
const OTHER_PROVIDER_VALUE = "__other__";

// Compact one-line account label (e.g. "BPI · Savings") for transfer history.
function accountLabel(account?: Account) {
    return account ? getAccountLabel(account) : "Unknown";
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
    onSubmit: (values: AccountFormValues) => void;
    onSubmitTransfer: (values: TransferFormValues) => void;
    transactions: Transaction[];
    transfers: Transfer[];
}) {
    const editing = accounts.find((account) => account.id === editingId);
    const editingTransfer = transfers.find(
        (transfer) => transfer.id === editingTransferId,
    );
    const [isAddingAccount, setIsAddingAccount] = useState(false);
    const [isAddingTransfer, setIsAddingTransfer] = useState(false);
    const canTransfer = accounts.length >= 2;

    const groups = accountTypeOrder
        .map((type) => ({
            type,
            accounts: accounts.filter((account) => account.type === type),
        }))
        .filter((group) => group.accounts.length > 0);

    return (
        <>
            <div className="space-y-4 md:space-y-5">
                <PageHeader
                    title="Accounts"
                    description="Track balances across your banks, e-wallets, and cash."
                    actions={
                        <div className="flex gap-2">
                            <Button
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
                    accounts={accounts}
                    transactions={transactions}
                    transfers={transfers}
                />

                <ConnectAccountCard />

                {accounts.length === 0 ? (
                    <EmptyState
                        className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed bg-white"
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
                                <div className="grid gap-3 sm:grid-cols-2">
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
                        accounts={accounts}
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
                        editing={editing}
                        modal
                        onCancel={onCancelEdit}
                        onDelete={() => {
                            onDelete(editing.id);
                            onCancelEdit();
                        }}
                        onSubmit={onSubmit}
                    />
                </EditModal>
            )}
            {isAddingTransfer && (
                <EditModal onClose={() => setIsAddingTransfer(false)}>
                    <TransferForm
                        accounts={accounts}
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
                        accounts={accounts}
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
                        "text-3xl font-semibold leading-9",
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
        <div className="flex flex-col gap-3 rounded-md border border-dashed border-border bg-neutral-50 p-4 sm:flex-row sm:items-center sm:justify-between">
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
            className="flex w-full items-center justify-between gap-3 rounded-md border bg-white p-4 text-left transition-colors md:hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <div className="flex min-w-0 items-center gap-3">
                <AccountLogo
                    account={account}
                    className="h-10 w-10"
                    iconClassName="h-5 w-5"
                />
                <div className="min-w-0">
                    <p className="truncate font-medium leading-5">{title}</p>
                    {secondary && (
                        <p className="mt-0.5 truncate text-xs leading-4 text-muted-foreground">
                            {secondary}
                        </p>
                    )}
                </div>
            </div>
            <p
                className={cn(
                    "shrink-0 text-right font-medium leading-5",
                    balance < 0 && "text-destructive",
                )}
            >
                {formatCurrency(balance)}
            </p>
        </button>
    );
}

function TransferHistory({
    accounts,
    transfers,
    onSelect,
}: {
    accounts: Account[];
    transfers: Transfer[];
    onSelect: (transfer: Transfer) => void;
}) {
    const accountsById = new Map(
        accounts.map((account) => [account.id, account]),
    );
    const sortedTransfers = transfers
        .slice()
        .sort((left, right) => {
            const dateOrder = right.date.localeCompare(left.date);

            if (dateOrder !== 0) {
                return dateOrder;
            }

            return right.time.localeCompare(left.time);
        });

    return (
        <section className="space-y-2">
            <h2 className="px-1 text-sm font-medium leading-5 text-muted-foreground">
                Transfers
            </h2>
            <div className="overflow-hidden rounded-md border bg-white divide-y">
                {sortedTransfers.map((transfer) => {
                    const fromAccount = accountsById.get(transfer.fromAccountId);
                    const toAccount = accountsById.get(transfer.toAccountId);

                    return (
                        <button
                            key={transfer.id}
                            type="button"
                            onClick={() => onSelect(transfer)}
                            className="flex w-full items-center justify-between gap-3 p-3 text-left transition-colors md:hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-foreground">
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
                  fromAccountId: accounts[0]?.id ?? "",
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
                                .filter(
                                    (account) => account.id !== toAccountId,
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
                                    className="flex-1 border-red-300 bg-white text-destructive md:hover:bg-red-50"
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
                                className="border-red-300 bg-white text-destructive md:hover:bg-red-50"
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
    editing,
    modal = false,
    onCancel,
    onDelete,
    onSubmit,
}: {
    editing?: Account;
    modal?: boolean;
    onCancel: () => void;
    onDelete?: () => void;
    onSubmit: (values: AccountFormValues) => void;
}) {
    const form = useForm<AccountFormValues>({
        resolver: zodResolver(accountFormSchema),
        values: editing
            ? {
                  name: editing.name,
                  type: editing.type,
                  color: editing.color,
                  icon: editing.icon,
                  openingBalance: editing.openingBalance,
                  provider: editing.provider,
                  externalId: editing.externalId,
                  syncStatus: editing.syncStatus ?? "manual",
              }
            : {
                  name: "",
                  type: "bank",
                  color: colorChoices[1],
                  icon: getDefaultAccountIcon("bank"),
                  openingBalance: 0,
                  // Default to the first bank brand so new accounts start on the
                  // logo-driven path rather than the custom-look path.
                  provider: getProvidersForType("bank")[0]?.key,
                  syncStatus: "manual",
              },
    });
    const selectedColor = form.watch("color");
    const selectedIcon = form.watch("icon");
    const selectedType = form.watch("type");
    const selectedProvider = form.watch("provider");

    const isEditing = Boolean(editing);
    const isModal = isEditing || modal;
    const providerChoices = getProvidersForType(selectedType);
    const supportsBrands = providerChoices.length > 0;
    // Whether the per-account look (color + icon) needs to be chosen manually:
    // only for Cash, or for a bank/e-wallet set to "Other" (no brand).
    const usesCustomLook = !supportsBrands || !selectedProvider;
    const brandLabel = selectedType === "ewallet" ? "E-Wallet" : "Bank";

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
                                    form.setValue("type", nextType, {
                                        shouldValidate: true,
                                    });
                                    form.setValue(
                                        "icon",
                                        getDefaultAccountIcon(nextType),
                                    );

                                    // Reset the brand selection when changing
                                    // type: default bank/e-wallet to their first
                                    // brand; cash has no brand.
                                    const nextProviders =
                                        getProvidersForType(nextType);
                                    form.setValue(
                                        "provider",
                                        nextProviders[0]?.key,
                                    );
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
                                onValueChange={(value) =>
                                    form.setValue(
                                        "provider",
                                        value === OTHER_PROVIDER_VALUE
                                            ? undefined
                                            : value,
                                    )
                                }
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
                                value={selectedProvider ?? OTHER_PROVIDER_VALUE}
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
                        <>
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
                            <FieldError
                                message={form.formState.errors.icon?.message}
                            >
                                <Label>Icon</Label>
                                <div className="mt-2 flex max-w-[560px] flex-wrap gap-2">
                                    {categoryIconChoices.map((choice) => {
                                        const Icon = choice.icon;
                                        const isSelected =
                                            selectedIcon === choice.value;

                                        return (
                                            <button
                                                key={choice.value}
                                                aria-label={`Use ${choice.label} icon`}
                                                className={cn(
                                                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors md:hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                                    isSelected &&
                                                        "border-[#2563EB] bg-[#E8F0FE] text-[#0B57D0] ring-2 ring-[#2563EB]/20",
                                                )}
                                                type="button"
                                                onClick={() =>
                                                    form.setValue(
                                                        "icon",
                                                        choice.value,
                                                        {
                                                            shouldValidate: true,
                                                        },
                                                    )
                                                }
                                            >
                                                <Icon
                                                    className="h-4 w-4"
                                                    aria-hidden
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            </FieldError>
                        </>
                    )}
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
                                className="border-red-300 bg-white text-destructive md:hover:bg-red-50"
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
