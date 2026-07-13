import Foundation
import Capacitor

/// Reads and clears the App Group queue that the Share Extension writes to, and
/// returns the items to JS as RawCapturedMessage objects. Runs in the main app
/// process (not the extension), on foreground.
@objc(SharedQueuePlugin)
public class SharedQueuePlugin: CAPPlugin {

    private let appGroupId = "group.com.kwarta.app"
    private let queueKey = "kwarta.capture.queue"

    @objc func drain(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: appGroupId) else {
            call.resolve(["items": []])
            return
        }

        let queue = defaults.array(forKey: queueKey) as? [[String: Any]] ?? []
        // Clear once read so items aren't ingested twice (JS dedup is a second
        // safety net, but empty the queue eagerly).
        defaults.removeObject(forKey: queueKey)

        call.resolve(["items": queue])
    }
}
