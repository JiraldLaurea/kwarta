import type { WorkspaceBackup } from "@/lib/kwarta/backup";

/**
 * Local-first cache of the full workspace. Unlike the daily auto-backup (which
 * is frozen at the first change of the day), this mirrors the live workspace on
 * every save so it can hydrate the UI instantly and survive being offline.
 *
 * A separate "pending sync" flag records that local changes have not yet been
 * accepted by the server, so they can be flushed when connectivity returns.
 */

type WorkspaceCacheEnvelope = {
    workspace: WorkspaceBackup;
    cachedAt: string;
};

function workspaceCacheKey(userId: string) {
    return `kwarta:workspace-cache:${userId}`;
}

function pendingSyncKey(userId: string) {
    return `kwarta:workspace-pending:${userId}`;
}

export function readCachedWorkspace(userId: string): WorkspaceBackup | null {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        const raw = window.localStorage.getItem(workspaceCacheKey(userId));

        if (!raw) {
            return null;
        }

        const parsed = JSON.parse(raw) as WorkspaceCacheEnvelope;

        if (
            !parsed ||
            typeof parsed !== "object" ||
            !parsed.workspace ||
            !Array.isArray(parsed.workspace.accounts) ||
            !Array.isArray(parsed.workspace.categories) ||
            !Array.isArray(parsed.workspace.transactions) ||
            !Array.isArray(parsed.workspace.budgets)
        ) {
            return null;
        }

        return {
            accounts: parsed.workspace.accounts,
            budgets: parsed.workspace.budgets,
            categories: parsed.workspace.categories,
            transactions: parsed.workspace.transactions,
            transfers: parsed.workspace.transfers ?? [],
        };
    } catch {
        return null;
    }
}

export function writeCachedWorkspace(
    userId: string,
    workspace: WorkspaceBackup,
) {
    if (typeof window === "undefined") {
        return;
    }

    try {
        const envelope: WorkspaceCacheEnvelope = {
            workspace,
            cachedAt: new Date().toISOString(),
        };
        window.localStorage.setItem(
            workspaceCacheKey(userId),
            JSON.stringify(envelope),
        );
    } catch {
        // Storage may be full or unavailable; the app stays usable in memory.
    }
}

export function markWorkspacePendingSync(userId: string, pending: boolean) {
    if (typeof window === "undefined") {
        return;
    }

    try {
        if (pending) {
            window.localStorage.setItem(pendingSyncKey(userId), "true");
        } else {
            window.localStorage.removeItem(pendingSyncKey(userId));
        }
    } catch {
        // Ignore storage failures.
    }
}

export function hasPendingWorkspaceSync(userId: string): boolean {
    if (typeof window === "undefined") {
        return false;
    }

    try {
        return window.localStorage.getItem(pendingSyncKey(userId)) === "true";
    } catch {
        return false;
    }
}
