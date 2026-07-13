import UIKit
import Social
import UniformTypeIdentifiers
import Vision

/// Kwarta Share Extension: accepts shared text or an image (screenshot) from
/// GCash / Maya / the Messages app, extracts the text (OCR for images, on-device
/// via Vision), and appends it to a shared App Group queue that the main app
/// drains on next foreground.
///
/// Parses nothing — it produces a RawCapturedMessage {source:"share", body} and
/// hands it to the app's TypeScript, same as the paste flow.
class ShareViewController: UIViewController {

    private let appGroupId = "group.com.kwarta.app"
    private let queueKey = "kwarta.capture.queue"

    override func viewDidLoad() {
        super.viewDidLoad()
        handleSharedItems()
    }

    private func handleSharedItems() {
        guard
            let items = extensionContext?.inputItems as? [NSExtensionItem]
        else {
            return complete()
        }

        let group = DispatchGroup()
        var captured: [String] = []

        for item in items {
            for provider in item.attachments ?? [] {
                if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) { data, _ in
                        if let text = data as? String, !text.isEmpty {
                            captured.append(text)
                        }
                        group.leave()
                    }
                } else if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.image.identifier) { data, _ in
                        self.recognizeText(from: data) { text in
                            if let text = text, !text.isEmpty {
                                captured.append(text)
                            }
                            group.leave()
                        }
                    }
                }
            }
        }

        group.notify(queue: .main) {
            for body in captured {
                self.enqueue(body: body)
            }
            self.complete()
        }
    }

    // On-device OCR. No network; the screenshot never leaves the phone.
    private func recognizeText(
        from data: Any?,
        completion: @escaping (String?) -> Void
    ) {
        let image: CGImage?
        if let url = data as? URL, let ui = UIImage(contentsOfFile: url.path) {
            image = ui.cgImage
        } else if let ui = data as? UIImage {
            image = ui.cgImage
        } else {
            image = nil
        }

        guard let cgImage = image else {
            return completion(nil)
        }

        let request = VNRecognizeTextRequest { request, _ in
            let lines = (request.results as? [VNRecognizedTextObservation] ?? [])
                .compactMap { $0.topCandidates(1).first?.string }
            completion(lines.joined(separator: "\n"))
        }
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        DispatchQueue.global(qos: .userInitiated).async {
            try? handler.perform([request])
        }
    }

    // Append one RawCapturedMessage to the App Group JSON queue.
    private func enqueue(body: String) {
        guard let defaults = UserDefaults(suiteName: appGroupId) else { return }
        var queue = defaults.array(forKey: queueKey) as? [[String: Any]] ?? []
        queue.append([
            "source": "share",
            "body": body,
            "receivedAt": ISO8601DateFormatter().string(from: Date()),
        ])
        defaults.set(queue, forKey: queueKey)
    }

    private func complete() {
        extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }
}
