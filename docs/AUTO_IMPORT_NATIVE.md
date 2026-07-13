# Auto-import: native capture (build on your machine)

Kwarta's Review Inbox already works in the browser/PWA today: paste an alert, or
share one into the installed app via the Web Share Target. What the web platform
**cannot** do is read other apps' notifications or SMS silently — there is no web
API for it. Truly hands-off capture needs a native shell.

This document is the run-on-your-machine track. None of it can be built or
verified in the cloud sandbox (no Xcode, Android SDK, or Gradle), so it ships as
source + steps you run locally. The web app is untouched by any of this until you
choose to wrap it.

## Architecture recap

The native layer is a **dumb pipe**. It captures raw alert text and forwards it,
unparsed, to the existing on-device TypeScript. All provider knowledge lives in
`lib/kwarta/auto-import.ts`; the native code knows nothing about GCash or banks.

```
 Android NotificationListenerService  ─┐
 iOS Share Extension (+ optional OCR) ─┼─▶  RawCapturedMessage  ─▶  ingestCapturedMessage()  ─▶  Review Inbox
 Web Share Target / paste (today)     ─┘        (JS bridge)            (lib/kwarta/pending-captures.ts)
```

The bridge hands JS an object matching `RawCapturedMessage` from
`lib/kwarta/auto-import.ts`:

```ts
type RawCapturedMessage = {
  source: "notification" | "sms" | "share" | "paste";
  appId?: string;   // Android package, e.g. "com.globe.gcash.android"
  sender?: string;  // SMS sender id, e.g. "GCash"
  title?: string;   // notification title
  body: string;     // the raw text — the only required field
  receivedAt?: string; // ISO timestamp
};
```

Everything downstream (parsing, dedup, merchant memory, auto-confirm, balance
sync) is already implemented and tested. The native work is only about producing
that object and delivering it to the WebView.

## 1. Wrap the app with Capacitor

Kwarta is a Next.js app served from a host (Vercel). The simplest, most robust
wrap points the native WebView at the **live hosted URL** rather than bundling a
static export — this keeps the PWA and the app on one codebase and one deploy.

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init Kwarta com.kwarta.app --web-dir=public
```

Then set the server URL in `capacitor.config.ts` so the shell loads the deployed
app (replace with your domain):

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.kwarta.app",
  appName: "Kwarta",
  webDir: "public",
  server: {
    url: "https://your-kwarta-domain.com",
    cleartext: false,
  },
};

export default config;
```

Add platforms and open the native IDEs:

```bash
npx cap add android
npx cap add ios
npx cap open android   # Android Studio
npx cap open ios       # Xcode
```

> If you prefer a fully offline/bundled build later, switch to `next export`-style
> static output and drop the `server.url`. The capture plugins below are
> unaffected either way.

## 2. Android: notification listener plugin

`NotificationListenerService` is the OS hook that lets an app read posted
notifications. It requires the user to grant "Notification access" in Settings —
there is no silent grant, by design. The plugin source is in
[`native/android/NotificationCapturePlugin`](../native/android/NotificationCapturePlugin).

### Wire-up steps (in Android Studio)

1. Copy the two Kotlin files and the manifest entries from
   `native/android/NotificationCapturePlugin/` into your generated
   `android/app/src/main/java/com/kwarta/app/` package.
2. Register the plugin in `MainActivity`:

   ```kotlin
   import com.kwarta.app.NotificationCapturePlugin

   class MainActivity : BridgeActivity() {
     override fun onCreate(savedInstanceState: Bundle?) {
       registerPlugin(NotificationCapturePlugin::class.java)
       super.onCreate(savedInstanceState)
     }
   }
   ```

3. Add the service + permission to `AndroidManifest.xml` (see the manifest
   snippet in the plugin folder).
4. On first run, call `NotificationCapture.requestAccess()` from JS to deep-link
   the user to the grant screen, then poll `hasAccess()`.

### Which packages to listen to

The listener filters to the packages Kwarta cares about, sourced from
`AUTO_IMPORT_APP_IDS` in `lib/kwarta/auto-import.ts`
(`com.globe.gcash.android`, `com.paymaya`, …). Keep that list authoritative in
TS and pass it down at startup so you never hard-code providers in Kotlin.

### JS glue

```ts
import { NotificationCapture } from "./plugins/notification-capture";
import { AUTO_IMPORT_APP_IDS } from "@/lib/kwarta/auto-import";

// Tell the native listener which packages to forward.
await NotificationCapture.configure({
  packages: Object.keys(AUTO_IMPORT_APP_IDS),
});

NotificationCapture.addListener("captured", (raw) => {
  // `raw` is already a RawCapturedMessage.
  window.dispatchEvent(new CustomEvent("kwarta:captured", { detail: raw }));
});
```

Then in `components/kwarta-app.tsx`, listen for `kwarta:captured` and hand the
payload to the same ingest path the paste/share flows use (see §5).

## 3. iOS: share extension (+ optional OCR)

iOS does **not** allow reading other apps' notifications. The supported path is a
**Share Extension**: the user taps Share on an SMS/notification/screenshot and
picks Kwarta. This is a deliberate, per-item action — the iOS equivalent of the
Web Share Target, but it also accepts **images**, which unlocks OCR of a
screenshot when text isn't shareable.

Scaffold in [`native/ios/ShareExtension`](../native/ios/ShareExtension):

- `ShareViewController.swift` — accepts shared **text** and **images**; for
  images it runs Apple's on-device **Vision** framework (`VNRecognizeTextRequest`)
  to OCR the screenshot, with no network round-trip.
- The extracted text is written to a **shared App Group** container
  (`group.com.kwarta.app`) as a small JSON queue.
- On next foreground, the main WebView drains the queue and ingests each item.

### Wire-up steps (in Xcode)

1. File ▸ New ▸ Target ▸ **Share Extension**, name it `KwartaShare`.
2. Replace the generated `ShareViewController.swift` with the one in the scaffold.
3. Enable **App Groups** capability on both the app and the extension, using the
   same group id (`group.com.kwarta.app`).
4. Add a tiny Capacitor plugin (`native/ios/SharedQueuePlugin`) that reads and
   clears the App Group queue, exposed to JS as `SharedQueue.drain()`.

### JS glue

```ts
import { SharedQueue } from "./plugins/shared-queue";
import { App } from "@capacitor/app";

async function drainSharedQueue() {
  const items = await SharedQueue.drain(); // RawCapturedMessage[]
  for (const raw of items) {
    window.dispatchEvent(new CustomEvent("kwarta:captured", { detail: raw }));
  }
}

App.addListener("appStateChange", ({ isActive }) => {
  if (isActive) void drainSharedQueue();
});
void drainSharedQueue(); // also on cold start
```

## 4. OCR notes

- **iOS**: Vision (`VNRecognizeTextRequest`, `.accurate`) runs fully on-device.
  Good for GCash/Maya screenshots where the text can't be selected.
- **Android**: for parity you can add ML Kit Text Recognition
  (`com.google.mlkit:text-recognition`) to the notification plugin's image path,
  or rely on the fact that Android notifications already expose their text
  (`extractText`), which makes OCR rarely necessary there.
- Either way the OCR'd string becomes `body` on a `RawCapturedMessage` with
  `source: "share"` — the parser doesn't care where the text came from.

## 5. One ingest path for every source

To keep native and web in lockstep, route **all** captures through a single
window event, then ingest with the existing store. Add this to the app once:

```ts
// inside KwartaApp, alongside the Web Share Target effect
useEffect(() => {
  function onCaptured(event: Event) {
    const raw = (event as CustomEvent<RawCapturedMessage>).detail;
    handleIngestCapturedMessage(raw); // thin wrapper over ingestCapturedMessage
  }
  window.addEventListener("kwarta:captured", onCaptured);
  return () => window.removeEventListener("kwarta:captured", onCaptured);
}, [/* deps */]);
```

`ingestCapturedMessage` already handles dedup (the processed-ledger + pending
scan), merchant→category suggestions, and hands recognized high-confidence items
to auto-confirm when the user has enabled it. So once the bridge is delivering
`RawCapturedMessage` objects, silent capture "just works" through the exact same
pipeline the paste button uses today.

## What is verifiable where

| Piece                                   | Verified in cloud sandbox | Needs your machine |
| --------------------------------------- | :-----------------------: | :----------------: |
| Parser (`auto-import.ts`) + unit tests  | ✅ (16 cases pass)         |                    |
| Ingest / dedup / merchant memory        | ✅                         |                    |
| Auto-confirm + balance sync             | ✅                         |                    |
| Web Share Target manifest               | ✅ (manifest emits shape)  |                    |
| Capacitor wrap                          |                           | ✅ Android Studio / Xcode |
| Android NotificationListenerService     |                           | ✅ device + grant   |
| iOS Share Extension + Vision OCR        |                           | ✅ Xcode + device    |

Build these on your machine and the raw-text bridge drops straight onto the
already-tested TypeScript.
