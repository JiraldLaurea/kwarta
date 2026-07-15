"use client";

import { useEffect, useRef, useState } from "react";

/**
 * An unobtrusive banner that appears when the device goes offline, so the
 * user knows the app is running from its local cache. Changes are saved locally
 * and re-synced automatically once the connection returns. Sits flush above
 * the mobile tab bar as a full-width strip; on desktop (no tab bar) it's a
 * floating pill below the header instead.
 */
export function OfflineIndicator() {
    const [isOffline, setIsOffline] = useState(false);
    const bannerRef = useRef<HTMLDivElement>(null);

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

    // Reserve room at the bottom of the page for the mobile banner so it never
    // covers the last elements. Only the mobile banner sits at the bottom; the
    // desktop pill floats below the header, so no bottom padding is needed
    // there. The page's scroll container reads --offline-banner-pad.
    useEffect(() => {
        const root = document.documentElement;

        function syncPadding() {
            const isMobile = window.matchMedia("(max-width: 767px)").matches;

            if (isOffline && isMobile && bannerRef.current) {
                root.style.setProperty(
                    "--offline-banner-pad",
                    `${bannerRef.current.offsetHeight}px`,
                );
            } else {
                root.style.removeProperty("--offline-banner-pad");
            }
        }

        syncPadding();
        window.addEventListener("resize", syncPadding);

        return () => {
            window.removeEventListener("resize", syncPadding);
            root.style.removeProperty("--offline-banner-pad");
        };
    }, [isOffline]);

    if (!isOffline) {
        return null;
    }

    return (
        <div
            aria-live="polite"
            role="status"
            className="pointer-events-none fixed inset-x-0 bottom-[var(--app-tabbar-h,env(safe-area-inset-bottom))] z-[51] md:bottom-auto md:top-[73px] md:flex md:justify-center md:px-4 md:pt-2"
        >
            <div
                ref={bannerRef}
                className="pointer-events-auto flex w-full items-center justify-center gap-2 border-t border-border bg-white/95 px-4 py-2.5 text-xs font-medium leading-4 text-muted-foreground backdrop-blur-md md:w-auto md:justify-start md:rounded-full md:border md:bg-card md:px-3 md:py-1.5 md:shadow-[0_8px_24px_rgba(0,0,0,0.12)] md:backdrop-blur-none"
            >
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                Offline — changes save locally and sync later
            </div>
        </div>
    );
}
