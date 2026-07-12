// Auto-import (phase 1 foundation): turn raw GCash / Maya / bank alert text
// into a structured transaction candidate.
//
// The native layer (Capacitor notification listener on Android, share/paste on
// iOS) is a dumb pipe: it only forwards the raw message here. All parsing is
// data-driven TypeScript so provider formats can be tested and updated without
// touching native code, and everything runs on-device — no message ever leaves
// the phone.
//
// Not yet wired into the UI; the Review Inbox consumes `parseCapturedMessage`
// and `buildExternalRef` (dedup key, so the SMS and push copies of the same
// payment never double-log).

export type CapturedMessageSource =
    | "notification"
    | "sms"
    | "share"
    | "paste";

export type RawCapturedMessage = {
    source: CapturedMessageSource;
    /** Android package that posted the notification, when known. */
    appId?: string;
    /** SMS sender id (e.g. "GCash"), when known. */
    sender?: string;
    title?: string;
    body: string;
    /** ISO timestamp of when the message arrived on the device. */
    receivedAt?: string;
};

export type AutoImportProviderId = "gcash" | "maya" | "bank";

export type ParsedCapturedMessage = {
    providerId: AutoImportProviderId;
    /** "in" = money received (income/cash-in), "out" = money spent/sent. */
    direction: "in" | "out";
    amount: number;
    /** Merchant or person on the other side, as written in the message. */
    counterparty?: string;
    /** Provider reference number — the strongest dedup signal. */
    ref?: string;
    /** Wallet/account balance after the transaction, when stated. */
    balanceAfter?: number;
    confidence: "high" | "medium" | "low";
    raw: RawCapturedMessage;
};

// Android packages the notification listener should subscribe to. Kept here so
// the native layer stays free of provider knowledge.
export const AUTO_IMPORT_APP_IDS: Record<string, AutoImportProviderId> = {
    "com.globe.gcash.android": "gcash",
    "com.paymaya": "maya",
};

const AMOUNT_PATTERN = /(?:PHP|Php|php|₱|P)\s*([\d,]+(?:\.\d{1,2})?)/;

// OTPs, verification codes, and promo blasts also come from these senders and
// must never become transactions.
const IGNORE_PATTERN =
    /\botp\b|one[- ]?time (?:pin|password)|verification code|do not share|promo\b/i;

type DirectionRule = {
    direction: "in" | "out";
    test: RegExp;
    counterparty?: RegExp;
};

type ProviderRules = {
    id: AutoImportProviderId;
    matches: (message: RawCapturedMessage) => boolean;
    rules: DirectionRule[];
};

const AMOUNT_INLINE = String.raw`(?:PHP|Php|php|₱|P)\s*[\d,]+(?:\.\d{1,2})?`;

const gcash: ProviderRules = {
    id: "gcash",
    matches: (message) =>
        /gcash/i.test(message.appId ?? "") ||
        /gcash/i.test(message.sender ?? "") ||
        /\bgcash\b/i.test(`${message.title ?? ""} ${message.body}`),
    rules: [
        {
            direction: "out",
            test: /\byou have sent\b/i,
            counterparty: new RegExp(
                String.raw`sent\s+${AMOUNT_INLINE}(?:\s+of GCash)?\s+to\s+(?<cp>.+?)(?=\s+w\/|\s+with\b|\s+via\b|\s+on\s|\s*\.|,|$)`,
                "i",
            ),
        },
        {
            direction: "out",
            test: /\byou have paid\b/i,
            counterparty: new RegExp(
                String.raw`paid\s+${AMOUNT_INLINE}\s+to\s+(?<cp>.+?)(?=\s+via\b|\s+using\b|\s+on\s|\s*\.|,|$)`,
                "i",
            ),
        },
        {
            direction: "in",
            test: /\byou have received\b/i,
            counterparty: new RegExp(
                String.raw`received\s+${AMOUNT_INLINE}(?:\s+of GCash)?\s+from\s+(?<cp>.+?)(?=\s+via\b|\s+on\s|\s*\.|,|$)`,
                "i",
            ),
        },
        {
            direction: "in",
            test: /\bcashed[- ]?in\b/i,
            counterparty: new RegExp(
                String.raw`cashed[- ]?in\s+${AMOUNT_INLINE}.*?\bvia\s+(?<cp>.+?)(?=\s*\.|,|$)`,
                "i",
            ),
        },
    ],
};

const maya: ProviderRules = {
    id: "maya",
    matches: (message) =>
        /paymaya|maya/i.test(message.appId ?? "") ||
        /^(?:pay)?maya$/i.test((message.sender ?? "").trim()) ||
        /\b(?:pay)?maya\b/i.test(`${message.title ?? ""} ${message.body}`),
    rules: [
        {
            direction: "out",
            test: /\byou (?:paid|sent)\b/i,
            counterparty: new RegExp(
                String.raw`(?:paid|sent)\s+${AMOUNT_INLINE}\s+to\s+(?<cp>.+?)(?=\s+via\b|\s+on\s|\s*\.|,|$)`,
                "i",
            ),
        },
        {
            direction: "in",
            test: /\byou received\b/i,
            counterparty: new RegExp(
                String.raw`received\s+${AMOUNT_INLINE}\s+from\s+(?<cp>.+?)(?=\s+via\b|\s+on\s|\s*\.|,|$)`,
                "i",
            ),
        },
    ],
};

// Fallback for bank alerts (BPI, BDO, UnionBank, Metrobank…): phrasing varies,
// so match on debit/credit verbs rather than exact templates.
const bank: ProviderRules = {
    id: "bank",
    matches: () => true,
    rules: [
        {
            direction: "out",
            test: /\b(?:debited|charged|deducted|purchase of|payment of)\b/i,
            counterparty: new RegExp(
                String.raw`\bat\s+(?<cp>.+?)(?=\s+on\s|\s*\.|,|$)`,
                "i",
            ),
        },
        {
            direction: "out",
            test: /\byou (?:paid|sent)\b/i,
            counterparty: new RegExp(
                String.raw`(?:paid|sent)\s+${AMOUNT_INLINE}\s+to\s+(?<cp>.+?)(?=\s+via\b|\s+on\s|\s*\.|,|$)`,
                "i",
            ),
        },
        {
            direction: "in",
            test: /\b(?:credited|deposited|you received)\b/i,
            counterparty: new RegExp(
                String.raw`received\s+${AMOUNT_INLINE}\s+from\s+(?<cp>.+?)(?=\s+via\b|\s+on\s|\s*\.|,|$)`,
                "i",
            ),
        },
    ],
};

// Order matters: specific wallets first, bank fallback last.
const PROVIDERS: ProviderRules[] = [gcash, maya, bank];

function parseAmountString(value: string) {
    const parsed = Number.parseFloat(value.replace(/,/g, ""));

    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function extractFirstAmount(body: string) {
    const match = body.match(AMOUNT_PATTERN);

    return match ? parseAmountString(match[1]) : null;
}

const REF_PATTERN = new RegExp(
    String.raw`\bref(?:erence)?\.?\s*(?:no\.?|number|#)?\s*:?\s*(?<ref>[A-Za-z0-9-]{4,})`,
    "i",
);

function extractRef(body: string) {
    return body.match(REF_PATTERN)?.groups?.ref;
}

function extractBalance(body: string) {
    const match = body.match(
        new RegExp(
            String.raw`balance(?:\s+is)?\s*:?\s*(?:PHP|Php|php|₱|P)\s*(?<bal>[\d,]+(?:\.\d{1,2})?)`,
            "i",
        ),
    );

    return match?.groups?.bal ? parseAmountString(match.groups.bal) : null;
}

function extractCounterparty(body: string, rule: DirectionRule) {
    if (!rule.counterparty) {
        return undefined;
    }

    const raw = body.match(rule.counterparty)?.groups?.cp;

    if (!raw) {
        return undefined;
    }

    const cleaned = raw.replace(/[\s.,]+$/, "").trim();

    return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Parse a captured alert into a transaction candidate, or null when the
 * message is not a transaction (OTP, promo, unrecognized format).
 */
export function parseCapturedMessage(
    message: RawCapturedMessage,
): ParsedCapturedMessage | null {
    const body = message.body.trim();

    if (!body || IGNORE_PATTERN.test(body)) {
        return null;
    }

    const provider = PROVIDERS.find((candidate) => candidate.matches(message));

    if (!provider) {
        return null;
    }

    const rule = provider.rules.find((candidate) => candidate.test.test(body));
    const amount = extractFirstAmount(body);

    if (!rule || amount === null) {
        return null;
    }

    const counterparty = extractCounterparty(body, rule);
    const ref = extractRef(body);
    const confidence =
        ref && counterparty ? "high" : ref || counterparty ? "medium" : "low";

    return {
        providerId: provider.id,
        direction: rule.direction,
        amount,
        counterparty,
        ref,
        balanceAfter: extractBalance(body) ?? undefined,
        confidence,
        raw: message,
    };
}

const FINANCIAL_CONTEXT_PATTERN =
    /gcash|maya|paymaya|bpi|bdo|unionbank|metrobank|landbank|pnb|security bank|maribank|gotyme|bank|debited|credited|deposited|you (?:paid|sent|received)/i;

/**
 * True when a message that failed to parse still looks like a real money
 * alert (has a peso amount, isn't an OTP/promo, comes from a financial
 * context). These surface in the inbox as "couldn't read this format" so the
 * user can add them manually, rather than being silently dropped.
 */
export function messageLooksFinancial(message: RawCapturedMessage): boolean {
    const body = message.body.trim();

    if (!body || IGNORE_PATTERN.test(body)) {
        return false;
    }

    if (extractFirstAmount(body) === null) {
        return false;
    }

    const haystack = `${message.appId ?? ""} ${message.sender ?? ""} ${
        message.title ?? ""
    } ${body}`;

    return FINANCIAL_CONTEXT_PATTERN.test(haystack);
}

/**
 * Stable dedup key for a parsed message. The provider reference number wins;
 * without one, fall back to the transaction's shape plus arrival time so
 * near-identical alerts (SMS + push of one payment) still collapse.
 */
export function buildExternalRef(parsed: ParsedCapturedMessage) {
    if (parsed.ref) {
        return `${parsed.providerId}:${parsed.ref}`;
    }

    const counterpartyKey = (parsed.counterparty ?? "unknown")
        .toLowerCase()
        .replace(/\s+/g, "-");
    const timeKey = (parsed.raw.receivedAt ?? "").slice(0, 16);

    return `${parsed.providerId}:${parsed.direction}:${parsed.amount}:${counterpartyKey}:${timeKey}`;
}
