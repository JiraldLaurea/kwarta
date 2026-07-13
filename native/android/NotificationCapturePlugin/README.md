# Android notification-capture plugin (scaffold)

Copy these files into your Capacitor-generated Android project under
`android/app/src/main/java/com/kwarta/app/`, then follow
[`docs/AUTO_IMPORT_NATIVE.md`](../../../docs/AUTO_IMPORT_NATIVE.md) §2.

Files:

- `NotificationCapturePlugin.kt` — the Capacitor plugin. JS API:
  `configure({ packages })`, `requestAccess()`, `hasAccess()`, and a `captured`
  listener that emits `RawCapturedMessage` objects.
- `KwartaNotificationListenerService.kt` — the `NotificationListenerService` that
  reads posted notifications, filters to the configured packages, extracts
  title/text, and forwards them to the plugin.
- `AndroidManifest.snippet.xml` — the `<service>` + permission to merge into your
  app manifest.

This cannot be compiled in the cloud sandbox (no Android SDK/Gradle). Build it in
Android Studio on your machine. The listener requires the user to grant
"Notification access" in system Settings — there is no silent grant.
