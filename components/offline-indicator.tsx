"use client";

import { useEffect, useState } from "react";

/**
 * An unobtrusive banner that appears when the device goes offline, so the
 * user knows the app is running from its local cache. Changes are saved locally
 * and re-synced automatically once the connection returns. Sits flush above
 * the mobile tab bar as a full-width strip; on desktop (no tab bar) it's a
 * floating pill below the header instead.
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
            className="pointer-events-none fixed inset-x-0 bottom-[calc(73px+env(safe-area-inset-bottom))] z-40 md:bottom-auto md:top-[73px] md:flex md:justify-center md:px-4 md:pt-2"
        >
            <div className="pointer-events-auto flex w-full items-center gap-2 border-t border-border bg-card px-4 py-2.5 text-xs font-medium leading-4 text-muted-foreground md:w-auto md:rounded-full md:border md:px-3 md:py-1.5 md:shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                Offline — changes save locally and sync later
            </div>
        </div>
    );
}
