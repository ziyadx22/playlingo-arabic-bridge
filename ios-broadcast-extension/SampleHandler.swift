// SPDX-License-Identifier: AGPL-3.0-only
// ReplayKit Broadcast Upload Extension: runs while the user plays in the official
// PS Remote Play app, reads English subtitles with Vision OCR inside the chosen
// screen region, translates them and pushes Arabic to the existing TV room.
import ReplayKit
import Vision
import CoreMedia
import Foundation

final class SampleHandler: RPBroadcastSampleHandler {
    private let defaults = UserDefaults(suiteName: "group.com.mzgta.app")
    private let work = DispatchQueue(label: "com.mzgta.broadcast.ocr", qos: .userInitiated)
    private var busy = false
    private var lastFrame = Date.distantPast
    private var candidate = ""
    private var lastSent = ""
    private var frames = 0
    private var room = ""
    private var apiBase = ""
    private var realtimeUrl = ""
    private var anonKey = ""
    private var regions: [CGRect] = []

    override func broadcastStarted(withSetupInfo setupInfo: [String: NSObject]?) {
        room = defaults?.string(forKey: "room") ?? ""
        apiBase = defaults?.string(forKey: "apiBase") ?? ""
        realtimeUrl = defaults?.string(forKey: "realtimeUrl") ?? ""
        anonKey = defaults?.string(forKey: "anonKey") ?? ""
        let raw = defaults?.array(forKey: "regions") as? [[String: Double]] ?? []
        // Vision uses a bottom-left origin; the app stores top-left fractions.
        regions = raw.compactMap { r in
            guard let x = r["x"], let y = r["y"], let w = r["w"], let h = r["h"], w > 0, h > 0 else { return nil }
            return CGRect(x: x, y: 1 - y - h, width: w, height: h).intersection(CGRect(x: 0, y: 0, width: 1, height: 1))
        }
        if regions.isEmpty { regions = [CGRect(x: 0.05, y: 0.06, width: 0.9, height: 0.24)] }
        guard room.range(of: "^\\d{6}$", options: .regularExpression) != nil, !apiBase.isEmpty, !realtimeUrl.isEmpty, !anonKey.isEmpty else {
            finishBroadcastWithError(NSError(domain: "MZGTA", code: 1, userInfo: [NSLocalizedDescriptionKey: "Pair MZGTA with your TV first, then start the capture again."]))
            return
        }
        status(["active": true, "startedAt": Date().timeIntervalSince1970, "error": ""])
    }

    override func broadcastFinished() { status(["active": false]) }
    override func broadcastPaused() { status(["active": false, "paused": true]) }
    override func broadcastResumed() { status(["active": true, "paused": false]) }

    override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer, with sampleBufferType: RPSampleBufferType) {
        guard sampleBufferType == .video, !busy, Date().timeIntervalSince(lastFrame) > 0.6,
              let pixels = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
        busy = true; lastFrame = Date(); frames += 1
        let orientation = (CMGetAttachment(sampleBuffer, key: RPVideoSampleOrientationKey as CFString, attachmentModeOut: nil) as? NSNumber)
            .flatMap { CGImagePropertyOrientation(rawValue: $0.uint32Value) } ?? .up
        work.async { [weak self] in
            guard let self = self else { return }
            defer { self.busy = false }
            var lines: [String] = []
            for region in self.regions {
                let request = VNRecognizeTextRequest()
                request.recognitionLevel = .accurate
                request.usesLanguageCorrection = true
                request.recognitionLanguages = ["en-US"]
                request.regionOfInterest = region
                try? VNImageRequestHandler(cvPixelBuffer: pixels, orientation: orientation).perform([request])
                let found = (request.results ?? []).compactMap { $0.topCandidates(1).first }
                    .filter { $0.confidence > 0.4 }.map { $0.string }
                lines.append(contentsOf: found)
            }
            let text = lines.joined(separator: " ").replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
                .trimmingCharacters(in: .whitespacesAndNewlines)
            self.status(["heartbeat": Date().timeIntervalSince1970, "frames": self.frames])
            // Only real English text, stable for two frames, and different from the last subtitle.
            guard text.count >= 3, text.count <= 600, text.range(of: "[A-Za-z]{2}", options: .regularExpression) != nil else { self.candidate = ""; return }
            guard text == self.candidate else { self.candidate = text; return }
            guard text.lowercased() != self.lastSent.lowercased() else { return }
            self.lastSent = text
            self.deliver(text)
        }
    }

    private func deliver(_ english: String) {
        guard let url = URL(string: apiBase + "/api/public/translate") else { return }
        var request = URLRequest(url: url, timeoutInterval: 12)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["text": english])
        URLSession.shared.dataTask(with: request) { [weak self] data, _, _ in
            guard let self = self else { return }
            let json = data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }
            guard let arabic = json?["ar"] as? String, !arabic.isEmpty else {
                self.status(["lastEnglish": english, "error": "translation"]); return
            }
            self.broadcast(english: english, arabic: arabic)
        }.resume()
    }

    private func broadcast(english: String, arabic: String) {
        guard let url = URL(string: realtimeUrl + "/realtime/v1/api/broadcast") else { return }
        let sub: [String: Any] = ["en": english, "ar": arabic, "speaker": "", "id": Int(Date().timeIntervalSince1970 * 1000)]
        let body: [String: Any] = ["messages": [["topic": "sard-room-\(room)", "event": "m", "private": false, "payload": ["t": "sub", "sub": sub]]]]
        var request = URLRequest(url: url, timeoutInterval: 8)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        URLSession.shared.dataTask(with: request) { [weak self] _, response, _ in
            let ok = (response as? HTTPURLResponse).map { (200..<300).contains($0.statusCode) } ?? false
            self?.status(ok ? ["lastEnglish": english, "lastArabic": arabic, "sentAt": Date().timeIntervalSince1970, "error": ""] : ["error": "tv"])
        }.resume()
    }

    private func status(_ values: [String: Any]) {
        var current = defaults?.dictionary(forKey: "captureStatus") ?? [:]
        values.forEach { current[$0.key] = $0.value }
        defaults?.set(current, forKey: "captureStatus")
    }
}
