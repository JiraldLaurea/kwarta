// Review Inbox store: the queue of captured money alerts waiting for the user
// to confirm, plus the two bits of memory that make confirming a one-tap job —
// which category a merchant maps to, and which alerts have already been handled
// (so re-capturing the same payment never double-logs).
//
// Everything here is client-side localStorage, keyed per user. Dedup is kept
// local on purpose: the backend transaction table has no external-reference
// column, so the "processed" ledger below is the durable source of truth for
// "have I already dealt with this alert?" across reloads and devices' own
// storage.
import type { Account, Transaction, Transfer } from "@/lib/types";
import { getAccountBalance } from "@/lib/kwarta/helpers";
import {
    buildExternalRef,
    messageLooksFinancial,
    parseCapturedMessage,
    type AutoImportProviderId,
    type RawCapturedMessage,
} from "@/lib/kwarta/auto-import";

export type PendingCapture = {
    id: string;
    createdAt: string;
    /** Whether the parser understood the message. */
    recognized: boolean;
    providerId: AutoImportProviderId;
    direction: "in" | "out";
    amount: number;
    counterparty?: string;
    externalRef: string;
    balanceAfter?: number;
    confidence: "high" | "medium" | "low";
    /** Account this alert maps to (matched by provider), when known. */
    accountId?: string;
    /** Remembered category for this merchant, when known. */
    suggestedCategoryId?: string;
    /** Kept for the "teach"/manual-add path on unrecognized alerts. */
    rawBody: string;
    source: RawCapturedMessage["source"];
};

const PENDING_KEY = (userId: string) => `kwarta:pending-captures:${userId}`;
const MERCHANT_KEY = (userId: string) => `kwarta:merchant-categories:${userId}`;
const PROCESSED_KEY = (userId: string) => `kwarta:processed-captures:${userId}`;
const AUTO_CONFIRM_KEY = (userId: string) =>
    `kwarta:auto-import-confirm:${userId}`;
const SYNC_BALANCE_KEY = (userId: string) => `kwarta:auto-import-sync:${userId}`;
// Cap the processed ledger so it can't grow without bound.
const PROCESSED_LIMIT = 1000;

function readJson<T>(key: string, fallback: T): T {
    try {
        const stored = window.localStorage.getItem(key);

        return stored ? (JSON.parse(stored) as T) : fallback;
    } catch {
        return fallback;
    }
}

function writeJson(key: string, value: unknown) {
    try {
        window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Storage full / unavailable — the inbox degrades to in-memory only.
    }
}

export function readPendingCaptures(userId: string): PendingCapture[] {
    const list = readJson<PendingCapture[]>(PENDING_KEY(userId), []);

    return Array.isArray(list) ? list : [];
}

export function writePendingCaptures(userId: string, list: PendingCapture[]) {
    writeJson(PENDING_KEY(userId), list);
}

export function readMerchantCategoryMap(
    userId: string,
): Record<string, string> {
    const map = readJson<Record<string, string>>(MERCHANT_KEY(userId), {});

    return map && typeof map === "object" ? map : {};
}

// Merchant names arrive noisy — trailing phone numbers, casing, punctuation.
// Normalize so "GRAB PH", "Grab Ph." and "grab  ph" share one memory slot.
export function normalizeMerchant(name: string): string {
    return name
        .toLowerCase()
        .replace(/\b\d[\d-]{5,}\b/g, " ") // phone / long numbers
        .replace(/[^a-z0-9 ]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function rememberMerchantCategory(
    userId: string,
    counterparty: string | undefined,
    categoryId: string,
) {
    const key = counterparty ? normalizeMerchant(counterparty) : "";

    if (!key) {
        return;
    }

    const map = readMerchantCategoryMap(userId);
    map[key] = categoryId;
    writeJson(MERCHANT_KEY(userId), map);
}

export function readProcessedCaptures(userId: string): string[] {
    const list = readJson<string[]>(PROCESSED_KEY(userId), []);

    return Array.isArray(list) ? list : [];
}

export function markProcessed(userId: string, externalRef: string) {
    const list = readProcessedCaptures(userId).filter((ref) => ref !== externalRef);
    list.push(externalRef);
    writeJson(PROCESSED_KEY(userId), list.slice(-PROCESSED_LIMIT));
}

// Auto-import preferences (per user, opt-in). "Auto-confirm" logs high-confidence
// captures of already-taught merchants without a review tap; "balance sync"
// nudges the mapped account's opening balance to match the alert's stated
// balance on confirm. Both default off so nothing rewrites a user's data by
// surprise.
export function readAutoConfirmPref(userId: string): boolean {
    return readJson<boolean>(AUTO_CONFIRM_KEY(userId), false) === true;
}

export function writeAutoConfirmPref(userId: string, value: boolean) {
    writeJson(AUTO_CONFIRM_KEY(userId), value);
}

export function readSyncBalancePref(userId: string): boolean {
    return readJson<boolean>(SYNC_BALANCE_KEY(userId), false) === true;
}

export function writeSyncBalancePref(userId: string, value: boolean) {
    writeJson(SYNC_BALANCE_KEY(userId), value);
}

// GCash / Maya alerts map to the matching connected account; the generic bank
// fallback can't tell which bank, so it's left for the user to pick.
function mapProviderToAccount(
    providerId: AutoImportProviderId,
    accounts: Account[],
): string | undefined {
    if (providerId === "gcash") {
        return accounts.find((account) => account.provider === "gcash")?.id;
    }

    if (providerId === "maya") {
        return accounts.find((account) => account.provider === "maya")?.id;
    }

    return undefined;
}

// Balance sync: when an alert states the wallet/account balance after the
// transaction, nudge that account's opening balance so Kwarta's computed
// balance matches the bank's authoritative number (absorbing any drift from
// missed entries or rounding). Opt-in; returns accounts unchanged when there's
// nothing to reconcile.
export function reconcileOpeningBalance(
    accounts: Account[],
    transactions: Transaction[],
    transfers: Transfer[],
    capture: PendingCapture,
): Account[] {
    if (!capture.accountId || capture.balanceAfter == null) {
        return accounts;
    }

    const account = accounts.find((item) => item.id === capture.accountId);

    if (!account) {
        return accounts;
    }

    const computed = getAccountBalance(account, transactions, transfers);
    const delta = capture.balanceAfter - computed;

    if (Math.abs(delta) < 0.005) {
        return accounts;
    }

    return accounts.map((item) =>
        item.id === account.id
            ? { ...item, openingBalance: item.openingBalance + delta }
            : item,
    );
}

export type IngestContext = {
    accounts: Account[];
    pending: PendingCapture[];
    /** External refs already confirmed or dismissed (durable dedup ledger). */
    processed: string[];
    merchantMap: Record<string, string>;
    now?: string;
};

export type IngestResult =
    | { status: "added"; capture: PendingCapture }
    | { status: "duplicate" }
    | { status: "ignored" };

/**
 * Turn one captured alert into a pending inbox item (or classify it away as a
 * duplicate / non-transaction). Pure: the caller persists the returned capture.
 */
export function ingestCapturedMessage(
    message: RawCapturedMessage,
    ctx: IngestContext,
): IngestResult {
    const parsed = parseCapturedMessage(message);
    const now = ctx.now ?? new Date().toISOString();

    if (parsed) {
        const externalRef = buildExternalRef(parsed);

        if (
            ctx.processed.includes(externalRef) ||
            ctx.pending.some((item) => item.externalRef === externalRef)
        ) {
            return { status: "duplicate" };
        }

        const suggestedCategoryId = parsed.counterparty
            ? ctx.merchantMap[normalizeMerchant(parsed.counterparty)]
            : undefined;

        return {
            status: "added",
            capture: {
                id: createId(),
                createdAt: now,
                recognized: true,
                providerId: parsed.providerId,
                direction: parsed.direction,
                amount: parsed.amount,
                counterparty: parsed.counterparty,
                externalRef,
                balanceAfter: parsed.balanceAfter,
                confidence: parsed.confidence,
                accountId: mapProviderToAccount(parsed.providerId, ctx.accounts),
                suggestedCategoryId,
                rawBody: message.body.trim(),
                source: message.source,
            },
        };
    }

    if (!messageLooksFinancial(message)) {
        return { status: "ignored" };
    }

    // Financial-looking but unparsed: surface it so the user can add it by hand.
    const externalRef = `unparsed:${message.source}:${(message.receivedAt ?? now).slice(0, 16)}:${message.body.trim().slice(0, 40)}`;

    if (
        ctx.processed.includes(externalRef) ||
        ctx.pending.some((item) => item.externalRef === externalRef)
    ) {
        return { status: "duplicate" };
    }

    return {
        status: "added",
        capture: {
            id: createId(),
            createdAt: now,
            recognized: false,
            providerId: "bank",
            direction: "out",
            amount: 0,
            externalRef,
            confidence: "low",
            rawBody: message.body.trim(),
            source: message.source,
        },
    };
}

function createId(): string {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return `cap-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
