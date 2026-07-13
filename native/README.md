# Kwarta native capture (build on your machine)

Source for wrapping Kwarta as a native app with silent auto-capture. **None of
this builds in CI or the cloud sandbox** — it needs Xcode / Android Studio /
Gradle locally. The web app and PWA do not depend on any of it.

Start with [`docs/AUTO_IMPORT_NATIVE.md`](../docs/AUTO_IMPORT_NATIVE.md).

```
native/
├── plugins/
│   ├── notification-capture.ts   # JS binding: Android notification listener
│   └── shared-queue.ts           # JS binding: iOS App Group queue drain
├── android/NotificationCapturePlugin/
│   ├── NotificationCapturePlugin.kt
│   ├── KwartaNotificationListenerService.kt
│   └── AndroidManifest.snippet.xml
└── ios/
    ├── ShareExtension/ShareViewController.swift   # text + image (Vision OCR)
    └── SharedQueuePlugin/{SharedQueuePlugin.swift,.m}
```

Every path produces a `RawCapturedMessage` (from `lib/kwarta/auto-import.ts`) and
feeds it to `ingestCapturedMessage` — the same, already-tested pipeline the paste
button and Web Share Target use today.
