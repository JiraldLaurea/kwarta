package com.kwarta.app

import android.content.Intent
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Bridge between [KwartaNotificationListenerService] and the WebView.
 *
 * JS API:
 *   configure({ packages: string[] })  — set the allow-list (from AUTO_IMPORT_APP_IDS)
 *   requestAccess()                     — open the system Notification-access screen
 *   hasAccess()                         — { granted: boolean }
 *   addListener("captured", cb)         — cb receives a RawCapturedMessage
 */
@CapacitorPlugin(name = "NotificationCapture")
class NotificationCapturePlugin : Plugin() {

    companion object {
        // Package allow-list, pushed from JS. Empty = capture nothing.
        @Volatile
        private var allowedPackages: Set<String> = emptySet()

        // The live plugin instance, so the service (a separate OS-managed object)
        // can reach the bridge to emit events.
        @Volatile
        private var instance: NotificationCapturePlugin? = null

        fun shouldCapture(packageName: String): Boolean =
            allowedPackages.contains(packageName)

        fun emitCaptured(
            appId: String,
            title: String?,
            body: String,
            postedAt: Long,
        ) {
            val plugin = instance ?: return
            val payload = JSObject().apply {
                put("source", "notification")
                put("appId", appId)
                if (title != null) put("title", title)
                put("body", body)
                put("receivedAt", java.time.Instant.ofEpochMilli(postedAt).toString())
            }
            plugin.notifyListeners("captured", payload)
        }
    }

    override fun load() {
        instance = this
    }

    override fun handleOnDestroy() {
        if (instance === this) {
            instance = null
        }
    }

    @PluginMethod
    fun configure(call: PluginCall) {
        val packages = call.getArray("packages")
        allowedPackages = buildSet {
            for (i in 0 until (packages?.length() ?: 0)) {
                packages?.getString(i)?.let { add(it) }
            }
        }
        call.resolve()
    }

    @PluginMethod
    fun requestAccess(call: PluginCall) {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        activity.startActivity(intent)
        call.resolve()
    }

    @PluginMethod
    fun hasAccess(call: PluginCall) {
        val enabled = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners",
        ) ?: ""
        val granted = enabled.split(":").any { it.contains(context.packageName) }
        call.resolve(JSObject().put("granted", granted))
    }
}
