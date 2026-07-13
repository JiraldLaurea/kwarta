// Capacitor JS binding for the Android NotificationCapture plugin.
// Import this from the app only inside a Capacitor build; on web the plugin is
// unavailable and the paste / Web Share Target paths cover capture instead.
import { registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import type { RawCapturedMessage } from "@/lib/kwarta/auto-import";

export interface NotificationCapturePlugin {
    /** Set the package allow-list (pass Object.keys(AUTO_IMPORT_APP_IDS)). */
    configure(options: { packages: string[] }): Promise<void>;
    /** Open the system "Notification access" grant screen. */
    requestAccess(): Promise<void>;
    /** Whether the listener has been granted access. */
    hasAccess(): Promise<{ granted: boolean }>;
    addListener(
        eventName: "captured",
        listener: (message: RawCapturedMessage) => void,
    ): Promise<PluginListenerHandle>;
}

export const NotificationCapture = registerPlugin<NotificationCapturePlugin>(
    "NotificationCapture",
);
