package com.kwarta.app

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/**
 * Reads posted notifications and forwards the ones from money apps (GCash, Maya,
 * banks) to [NotificationCapturePlugin] as raw text. It parses nothing — all
 * provider logic lives in the app's TypeScript (lib/kwarta/auto-import.ts).
 *
 * Requires the user to grant "Notification access" in system Settings; the OS
 * will not start this service otherwise.
 */
class KwartaNotificationListenerService : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        val notification = sbn?.notification ?: return
        val packageName = sbn.packageName ?: return

        // Only forward packages the app asked for. The allow-list is pushed down
        // from JS (AUTO_IMPORT_APP_IDS) via the plugin; default to none so a
        // fresh install captures nothing until configured.
        if (!NotificationCapturePlugin.shouldCapture(packageName)) {
            return
        }

        val extras = notification.extras ?: return
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
        val text = extractText(extras)?.trim().orEmpty()

        // No body, nothing to parse.
        if (text.isEmpty()) {
            return
        }

        NotificationCapturePlugin.emitCaptured(
            appId = packageName,
            title = title,
            body = text,
            postedAt = sbn.postTime,
        )
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // No-op: dedup and lifecycle are handled app-side.
    }

    // Notifications carry text in several extras depending on style (big text,
    // inbox, messaging). Prefer the fullest one available.
    private fun extractText(extras: android.os.Bundle): String? {
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
        if (!bigText.isNullOrBlank()) {
            return bigText.toString()
        }

        val lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
        if (lines != null && lines.isNotEmpty()) {
            return lines.joinToString("\n") { it.toString() }
        }

        return extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
    }
}
