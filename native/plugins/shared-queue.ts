// Capacitor JS binding for the iOS SharedQueue plugin: drains items the Share
// Extension wrote to the App Group container. Web builds never call this.
import { registerPlugin } from "@capacitor/core";
import type { RawCapturedMessage } from "@/lib/kwarta/auto-import";

export interface SharedQueuePlugin {
    /** Read and clear the App Group queue, returning captured messages. */
    drain(): Promise<{ items: RawCapturedMessage[] }>;
}

export const SharedQueue = registerPlugin<SharedQueuePlugin>("SharedQueue");
