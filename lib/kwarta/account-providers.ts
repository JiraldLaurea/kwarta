import type { IconType } from "react-icons";
import {
    SiGrab,
    SiMastercard,
    SiPaypal,
    SiShopee,
    SiVisa,
    SiWise,
} from "react-icons/si";
import type { AccountType } from "@/lib/types";

export type AccountProviderKind = "wordmark" | "brand-icon";

export type AccountProvider = {
    /** Stable key persisted on Account.provider. */
    key: string;
    label: string;
    /** Which account types this provider is offered for. */
    types: AccountType[];
    /** Brand color used as the logo tile background / icon color. */
    color: string;
    /** Foreground color for wordmark text on the tile. */
    textColor?: string;
    kind: AccountProviderKind;
    /** Short text shown for wordmark logos (e.g. "BPI", "GCash"). */
    wordmark?: string;
    /** Bundled Simple Icons brand glyph for brand-icon providers. */
    icon?: IconType;
    /**
     * Whether an official SVG file is expected at
     * `/public/account-logos/<key>.svg`. When true, the UI renders that file
     * and falls back to the wordmark tile if it is missing. Drop official SVGs
     * into that folder to enable real logos.
     */
    hasLogoFile?: boolean;
};

/** Public path for an account provider's bundled SVG logo file. */
export function getProviderLogoSrc(key: string) {
    return `/account-logos/${key}.svg`;
}

// Wordmark-style entries render the brand name on a colored tile. They are
// deliberately simple, recognizable representations rather than copies of
// official logo artwork — replace with official SVGs by swapping these out.
export const accountProviders: AccountProvider[] = [
    // E-wallets
    {
        key: "gcash",
        label: "GCash",
        types: ["ewallet"],
        color: "#007DFE",
        kind: "wordmark",
        wordmark: "GCash",
        hasLogoFile: true,
    },
    {
        key: "maya",
        label: "Maya",
        types: ["ewallet"],
        color: "#1DC472",
        kind: "wordmark",
        wordmark: "maya",
        hasLogoFile: true,
    },
    {
        key: "grabpay",
        label: "GrabPay",
        types: ["ewallet"],
        color: "#00B14F",
        kind: "brand-icon",
        icon: SiGrab,
    },
    {
        key: "shopeepay",
        label: "ShopeePay",
        types: ["ewallet"],
        color: "#EE4D2D",
        kind: "brand-icon",
        icon: SiShopee,
    },
    {
        key: "paypal",
        label: "PayPal",
        types: ["ewallet"],
        color: "#003087",
        kind: "brand-icon",
        icon: SiPaypal,
    },
    {
        key: "wise",
        label: "Wise",
        types: ["ewallet"],
        color: "#163300",
        textColor: "#9FE870",
        kind: "brand-icon",
        icon: SiWise,
    },
    // Banks
    {
        key: "bpi",
        label: "BPI",
        types: ["bank"],
        color: "#B11116",
        kind: "wordmark",
        wordmark: "BPI",
        hasLogoFile: true,
    },
    {
        key: "bdo",
        label: "BDO",
        types: ["bank"],
        color: "#00387B",
        kind: "wordmark",
        wordmark: "BDO",
        hasLogoFile: true,
    },
    {
        key: "unionbank",
        label: "UnionBank",
        types: ["bank"],
        color: "#F58220",
        kind: "wordmark",
        wordmark: "UB",
        hasLogoFile: true,
    },
    {
        key: "metrobank",
        label: "Metrobank",
        types: ["bank"],
        color: "#003C71",
        kind: "wordmark",
        wordmark: "Metro",
    },
    {
        key: "landbank",
        label: "Landbank",
        types: ["bank"],
        color: "#0B7A3B",
        kind: "wordmark",
        wordmark: "LBP",
    },
    {
        key: "pnb",
        label: "PNB",
        types: ["bank"],
        color: "#00529C",
        kind: "wordmark",
        wordmark: "PNB",
    },
    {
        key: "securitybank",
        label: "Security Bank",
        types: ["bank"],
        color: "#00563F",
        kind: "wordmark",
        wordmark: "SB",
    },
    {
        key: "maribank",
        label: "Maribank",
        types: ["bank"],
        color: "#F4511E",
        kind: "wordmark",
        wordmark: "Mari",
        hasLogoFile: true,
    },
    {
        key: "gotyme",
        label: "GoTyme",
        types: ["bank"],
        color: "#1A1A1A",
        kind: "wordmark",
        wordmark: "GoTyme",
        hasLogoFile: true,
    },
    // Cards (offered for bank accounts that represent a card)
    {
        key: "visa",
        label: "Visa",
        types: ["bank"],
        color: "#1A1F71",
        kind: "brand-icon",
        icon: SiVisa,
    },
    {
        key: "mastercard",
        label: "Mastercard",
        types: ["bank"],
        color: "#EB001B",
        kind: "brand-icon",
        icon: SiMastercard,
    },
];

const providersByKey = new Map(
    accountProviders.map((provider) => [provider.key, provider]),
);

export function getAccountProvider(key?: string) {
    if (!key) {
        return undefined;
    }

    return providersByKey.get(key);
}

export function getProvidersForType(type: AccountType) {
    return accountProviders.filter((provider) => provider.types.includes(type));
}

/**
 * Primary title for an account. Brand accounts show the brand name (e.g.
 * "BPI"); other/cash accounts show their typed name.
 */
export function getAccountTitle(account: {
    name: string;
    provider?: string;
}) {
    const provider = getAccountProvider(account.provider);

    if (provider) {
        return provider.label;
    }

    return account.name;
}

/**
 * Optional secondary label used to separate similar brand accounts (e.g. two
 * BPI accounts distinguished by "Savings" / "Payroll"). Empty for non-brand
 * accounts, where the name is already the title.
 */
export function getAccountSubtitle(account: {
    name: string;
    provider?: string;
}) {
    const provider = getAccountProvider(account.provider);

    if (provider) {
        return account.name.trim();
    }

    return "";
}

/**
 * Compact single-line label combining title and subtitle, e.g. "BPI · Savings"
 * (or just "BPI" / the typed name). Used in dropdowns and lists.
 */
export function getAccountLabel(account: { name: string; provider?: string }) {
    const title = getAccountTitle(account);
    const subtitle = getAccountSubtitle(account);

    return subtitle ? `${title} · ${subtitle}` : title;
}
