"use client";

import { useMemo, useState } from "react";
import {
    LuArrowLeft as ArrowLeft,
    LuInbox as Inbox,
    LuClipboardPaste as ClipboardPaste,
    LuSettings2 as Settings2,
    LuChevronDown as ChevronDown,
} from "react-icons/lu";
import type { Account, Category } from "@/lib/types";
import type { PendingCapture } from "@/lib/kwarta/pending-captures";
import { cn, formatCurrency } from "@/lib/utils";
import { getAccountLabel } from "@/lib/kwarta/account-providers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    CategoryIconBadge,
    EditModal,
    EmptyState,
    PageHeader,
    ToggleSwitch,
} from "@/components/kwarta/shared";

const PROVIDER_LABEL: Record<PendingCapture["providerId"], string> = {
    gcash: "GCash",
    maya: "Maya",
    bank: "Bank",
};

function formatCapturedTime(iso: string) {
    const date = new Date(iso);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleTimeString("en-PH", {
        hour: "numeric",
        minute: "2-digit",
    });
}

export function ReviewInboxView({
    captures,
    expenseCategories,
    incomeCategories,
    accounts,
    autoConfirmEnabled,
    syncBalanceEnabled,
    onAutoConfirmChange,
    onSyncBalanceChange,
    onClose,
    onConfirm,
    onDismiss,
    onConfirmAllSuggested,
    onIngestText,
}: {
    captures: PendingCapture[];
    expenseCategories: Category[];
    incomeCategories: Category[];
    accounts: Account[];
    autoConfirmEnabled: boolean;
    syncBalanceEnabled: boolean;
    onAutoConfirmChange: (value: boolean) => void;
    onSyncBalanceChange: (value: boolean) => void;
    onClose: () => void;
    onConfirm: (
        capture: PendingCapture,
        categoryId: string,
        accountId: string,
    ) => void;
    onDismiss: (capture: PendingCapture) => void;
    onConfirmAllSuggested: () => void;
    onIngestText: (text: string) => void;
}) {
    const [pasteOpen, setPasteOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const suggestedCount = useMemo(
        () =>
            captures.filter(
                (capture) => capture.recognized && capture.suggestedCategoryId,
            ).length,
        [captures],
    );

    return (
        <>
            <EditModal allowContentScroll onClose={onClose}>
                <div className="space-y-5 bg-white px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-2">
                    <PageHeader
                        title="Review inbox"
                        description="Captured money alerts waiting for you. Nothing is logged until you confirm."
                    />

                    <button
                        type="button"
                        onClick={() => setPasteOpen(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card p-4 text-sm font-semibold text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 md:hover:bg-[hsl(var(--hover-surface))]"
                    >
                        <ClipboardPaste className="h-4 w-4" aria-hidden />
                        Paste an alert from GCash, Maya or your bank
                    </button>

                    <div className="rounded-2xl border border-border bg-card">
                        <button
                            type="button"
                            aria-expanded={settingsOpen}
                            onClick={() => setSettingsOpen((open) => !open)}
                            className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 md:hover:bg-[hsl(var(--hover-surface))]"
                        >
                            <Settings2
                                className="h-4 w-4 text-muted-foreground"
                                aria-hidden
                            />
                            Automation
                            <ChevronDown
                                className={cn(
                                    "ml-auto h-4 w-4 text-muted-foreground transition-transform",
                                    settingsOpen && "rotate-180",
                                )}
                                aria-hidden
                            />
                        </button>
                        {settingsOpen && (
                            <div className="space-y-4 border-t border-border px-4 py-4">
                                <SettingRow
                                    title="Auto-confirm known merchants"
                                    description="Log high-confidence alerts from merchants you've already categorized, without a review tap."
                                    checked={autoConfirmEnabled}
                                    onChange={onAutoConfirmChange}
                                />
                                <SettingRow
                                    title="Sync account balance"
                                    description="Automatically update the matched account to the balance an alert reports — no confirm needed."
                                    checked={syncBalanceEnabled}
                                    onChange={onSyncBalanceChange}
                                />
                            </div>
                        )}
                    </div>

                    {captures.length === 0 ? (
                        <EmptyState
                            title="Inbox zero"
                            description="Paste a GCash, Maya or bank alert above and it'll show up here to confirm. On the app, connect notifications to fill this automatically."
                        />
                    ) : (
                        <>
                            {suggestedCount > 1 && (
                                <Button
                                    type="button"
                                    className="h-12 w-full select-none rounded-2xl text-sm font-bold"
                                    onClick={onConfirmAllSuggested}
                                >
                                    Add all {suggestedCount} suggested
                                </Button>
                            )}
                            <div className="space-y-3">
                                {captures.map((capture) => (
                                    <PendingCaptureCard
                                        key={capture.id}
                                        capture={capture}
                                        categories={
                                            capture.direction === "in"
                                                ? incomeCategories
                                                : expenseCategories
                                        }
                                        accounts={accounts}
                                        onConfirm={onConfirm}
                                        onDismiss={onDismiss}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </EditModal>

            {pasteOpen && (
                <PasteAlertModal
                    onClose={() => setPasteOpen(false)}
                    onSubmit={(text) => {
                        onIngestText(text);
                        setPasteOpen(false);
                    }}
                />
            )}
        </>
    );
}

function PendingCaptureCard({
    capture,
    categories,
    accounts,
    onConfirm,
    onDismiss,
}: {
    capture: PendingCapture;
    categories: Category[];
    accounts: Account[];
    onConfirm: (
        capture: PendingCapture,
        categoryId: string,
        accountId: string,
    ) => void;
    onDismiss: (capture: PendingCapture) => void;
}) {
    const defaultCategoryId =
        (capture.suggestedCategoryId &&
        categories.some(
            (category) => category.id === capture.suggestedCategoryId,
        )
            ? capture.suggestedCategoryId
            : categories[0]?.id) ?? "";
    const [selectedCategoryId, setSelectedCategoryId] =
        useState(defaultCategoryId);
    // Which account this payment came from — pre-picked when the alert maps to
    // one (GCash/Maya), otherwise the first account, so a bank/paste alert can
    // still be attributed and deduct from the right balance on confirm.
    const [selectedAccountId, setSelectedAccountId] = useState(
        capture.accountId ?? accounts[0]?.id ?? "",
    );

    const account = accounts.find((item) => item.id === selectedAccountId);
    const selectedCategory = categories.find(
        (category) => category.id === selectedCategoryId,
    );
    const isIncome = capture.direction === "in";

    const title = capture.recognized
        ? isIncome
            ? `From ${capture.counterparty ?? "Unknown"}`
            : (capture.counterparty ?? "Payment")
        : "Couldn't read this alert";

    if (!capture.recognized) {
        return (
            <div className="rounded-2xl border border-dashed border-border bg-card p-4">
                <p className="text-sm font-semibold leading-5">{title}</p>
                <p className="mt-1 line-clamp-3 text-xs leading-4 text-muted-foreground">
                    {capture.rawBody}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                        Add this one by hand from Transactions.
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        className="h-9 rounded-full px-3 text-sm font-semibold text-muted-foreground"
                        onClick={() => onDismiss(capture)}
                    >
                        Dismiss
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
                {selectedCategory ? (
                    <CategoryIconBadge
                        category={selectedCategory}
                        className="h-10 w-10"
                        iconClassName="h-5 w-5"
                    />
                ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Inbox className="h-5 w-5" aria-hidden />
                    </span>
                )}
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold leading-5">
                        {title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs leading-4 text-muted-foreground">
                        <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 font-semibold">
                            {PROVIDER_LABEL[capture.providerId]}
                        </span>
                        {account ? getAccountLabel(account) : "Pick account"}
                        {" · "}
                        {formatCapturedTime(capture.createdAt)}
                    </p>
                </div>
                <span
                    className={cn(
                        "shrink-0 text-base font-bold tabular-nums",
                        isIncome && "text-accent-muted-foreground",
                    )}
                >
                    {isIncome ? "+" : "−"}
                    {formatCurrency(capture.amount)}
                </span>
            </div>

            <div className="mt-3">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {categories.map((category) => {
                        const selected = category.id === selectedCategoryId;

                        return (
                            <button
                                key={category.id}
                                type="button"
                                aria-pressed={selected}
                                onClick={() =>
                                    setSelectedCategoryId(category.id)
                                }
                                className={cn(
                                    "flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border bg-muted pl-1.5 pr-3.5 text-sm font-semibold text-foreground transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                                    selected
                                        ? "border-accent ring-1 ring-accent"
                                        : "border-border",
                                )}
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

            {accounts.length > 0 && (
                <div className="mt-3">
                    <Label className="text-xs text-muted-foreground">
                        Account
                    </Label>
                    <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {accounts.map((item) => {
                            const selected = item.id === selectedAccountId;

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => setSelectedAccountId(item.id)}
                                    className={cn(
                                        "flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border bg-muted px-3.5 text-sm font-semibold text-foreground transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                                        selected
                                            ? "border-accent ring-1 ring-accent"
                                            : "border-border",
                                    )}
                                >
                                    {getAccountLabel(item)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-3 flex items-center gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    className="h-11 flex-1 select-none rounded-xl text-sm font-bold"
                    onClick={() => onDismiss(capture)}
                >
                    Dismiss
                </Button>
                <Button
                    type="button"
                    className="h-11 flex-[1.6] select-none rounded-xl text-sm font-bold"
                    disabled={!selectedCategoryId || !selectedAccountId}
                    onClick={() =>
                        onConfirm(
                            capture,
                            selectedCategoryId,
                            selectedAccountId,
                        )
                    }
                >
                    Add{selectedCategory ? ` to ${selectedCategory.name}` : ""}
                </Button>
            </div>
        </div>
    );
}

function SettingRow({
    title,
    description,
    checked,
    onChange,
}: {
    title: string;
    description: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-5">{title}</p>
                <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                    {description}
                </p>
            </div>
            <ToggleSwitch
                checked={checked}
                onChange={onChange}
                className="mt-0.5"
            />
        </div>
    );
}

function PasteAlertModal({
    onClose,
    onSubmit,
}: {
    onClose: () => void;
    onSubmit: (text: string) => void;
}) {
    const [text, setText] = useState("");

    return (
        <EditModal allowContentScroll onClose={onClose}>
            <div className="min-h-dvh bg-white px-6 pb-6 pt-2 sm:min-h-0 sm:rounded-2xl">
                <div className="flex items-center gap-2">
                    <button
                        aria-label="Back to review inbox"
                        data-modal-close
                        type="button"
                        className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hover:bg-[hsl(var(--hover-surface))] md:hover:text-foreground"
                    >
                        <ArrowLeft className="h-5 w-5" aria-hidden />
                    </button>
                    <h2 className="text-2xl font-medium leading-8">
                        Paste an alert
                    </h2>
                </div>
                <p className="mt-2 text-base leading-6 text-muted-foreground">
                    Copy the SMS or notification from GCash, Maya, or your bank
                    and paste it here. Kwarta reads it on your phone — the text
                    is never uploaded.
                </p>
                <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    rows={5}
                    placeholder="You have paid PHP 350.00 to Grab. Ref. No. 1234567890."
                    className="mt-4 w-full resize-none rounded-2xl border border-border bg-muted p-4 text-base leading-6 text-foreground placeholder:text-muted-foreground/50 focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20"
                />
                <Button
                    type="button"
                    className="mt-4 h-14 w-full select-none rounded-2xl text-base font-bold disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100"
                    disabled={text.trim().length === 0}
                    onClick={() => onSubmit(text.trim())}
                >
                    Add to inbox
                </Button>
            </div>
        </EditModal>
    );
}
