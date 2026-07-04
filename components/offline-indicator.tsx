"use client";

import { useEffect, useState } from "react";

/**
 * A small, unobtrusive pill that appears when the device goes offline, so the
 * user knows the app is running from its local cache. Changes are saved locally
 * and re-synced automatically once the connection returns.
 */
export function OfflineIndicator() {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        function update() {
            setIsOffline(!navigator.onLine);
        }

        update();
        window.addEventListener("online", update);
        window.addEventListener("offline", update);

        return () => {
            window.removeEventListener("online", update);
            window.removeEventListener("offline", update);
        };
    }, []);

    if (!isOffline) {
        return null;
    }

    return (
        <div
            aria-live="polite"
            role="status"
            className="pointer-events-none fixed inset-x-0 top-[65px] z-40 flex justify-center px-4 pt-2"
        >
            <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium leading-4 text-muted-foreground shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                Offline — changes save locally and sync later
            </div>
        </div>
    );
}
