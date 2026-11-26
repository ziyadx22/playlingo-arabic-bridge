// SPDX-License-Identifier: AGPL-3.0-only
import Foundation
import Capacitor
import ReplayKit
import UIKit

/// Configures and launches the MZGTA ReplayKit broadcast extension. iOS requires the
/// user to confirm screen broadcasting in the system sheet; apps cannot start it silently.
@objc(ScreenCapturePlugin)
public final class ScreenCapturePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ScreenCapturePlugin"
    public let jsName = "MZGTACapture"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "showPicker", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise)
    ]
    private let defaults = UserDefaults(suiteName: "group.com.mzgta.app")
    private let extensionId = "com.mzgta.app.MZGTABroadcast"

    @objc func configure(_ call: CAPPluginCall) {
        guard let defaults = defaults else { call.reject("App Group group.com.mzgta.app is not enabled in signing", "NO_APP_GROUP"); return }
        guard let room = call.getString("room"), room.range(of: "^\\d{6}$", options: .regularExpression) != nil,
              let apiBase = call.getString("apiBase"), apiBase.hasPrefix("https://"),
              let realtimeUrl = call.getString("realtimeUrl"), realtimeUrl.hasPrefix("https://"),
              let anonKey = call.getString("anonKey"), !anonKey.isEmpty else { call.reject("Invalid capture configuration", "INVALID"); return }
        let regions = (call.getArray("regions") as? [[String: Any]] ?? []).compactMap { r -> [String: Double]? in
            guard let x = r["x"] as? Double, let y = r["y"] as? Double, let w = r["w"] as? Double, let h = r["h"] as? Double else { return nil }
            return ["x": x, "y": y, "w": w, "h": h]
        }
        defaults.set(room, forKey: "room"); defaults.set(apiBase, forKey: "apiBase")
        defaults.set(realtimeUrl, forKey: "realtimeUrl"); defaults.set(anonKey, forKey: "anonKey")
        defaults.set(regions, forKey: "regions")
        call.resolve(["configured": true])
    }

    @objc func showPicker(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let host = self.bridge?.viewController?.view else { call.reject("No view", "NO_VIEW"); return }
            let picker = RPSystemBroadcastPickerView(frame: CGRect(x: 0, y: 0, width: 1, height: 1))
            picker.preferredExtension = self.extensionId
            picker.showsMicrophoneButton = false
            picker.alpha = 0.01
            host.addSubview(picker)
            let button = picker.subviews.compactMap { $0 as? UIButton }.first
            button?.sendActions(for: .touchUpInside)
            DispatchQueue.main.asyncAfter(deadline: .now() + 1) { picker.removeFromSuperview() }
            button == nil ? call.reject("Broadcast picker unavailable", "NO_PICKER") : call.resolve(["shown": true])
        }
    }

    @objc func getStatus(_ call: CAPPluginCall) {
        var result = JSObject()
        for (key, value) in defaults?.dictionary(forKey: "captureStatus") ?? [:] {
            if let v = value as? Bool { result[key] = v }
            else if let v = value as? Double { result[key] = v }
            else if let v = value as? Int { result[key] = v }
            else if let v = value as? String { result[key] = v }
        }
        call.resolve(result)
    }
}
