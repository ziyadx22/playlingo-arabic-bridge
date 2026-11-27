// SPDX-License-Identifier: AGPL-3.0-only
import Foundation
import Capacitor
import Network
import Security
import Darwin
import WebKit
import UIKit

@objc(PS5RemotePlayPlugin)
public final class PS5RemotePlayPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PS5RemotePlayPlugin"
    public let jsName = "PS5RemotePlay"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getCapabilities", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "discoverConsoles", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "probeConsole", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "registerConsole", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getRegistration", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeRegistration", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signInPSN", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPSNAccount", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "signOutPSN", returnType: CAPPluginReturnPromise)
    ]
    private let queue = DispatchQueue(label: "com.mzgta.remoteplay", qos: .userInitiated)
    private let service = "com.mzgta.remoteplay.keys"

    /// Info.plist MZGTAPS5Discovery=false marks builds signed without Apple's multicast
    /// entitlement. Broadcast discovery is unavailable there, but unicast UDP to a
    /// typed console address and Chiaki registration only need Local Network access.
    private var autoDiscovery: Bool {
        Bundle.main.object(forInfoDictionaryKey: "MZGTAPS5Discovery") as? Bool != false
    }
    @objc func getCapabilities(_ call: CAPPluginCall) {
        call.resolve(["autoDiscovery": autoDiscovery, "manualAddress": true, "registration": true])
    }
    @objc func discoverConsoles(_ call: CAPPluginCall) {
        guard autoDiscovery else {
            call.reject("Automatic discovery needs Apple's multicast entitlement. Enter the PS5 IP address instead.", "MULTICAST_UNAVAILABLE"); return
        }
        withWiFi(call) { try self.search(destinations: try self.broadcastAddresses(), broadcast: true, duration: 4) }
    }
    /// Sends the PS5 search packet straight to one address (no broadcast) and returns
    /// the console only when it actually answers with a PS5/PS4 discovery response.
    @objc func probeConsole(_ call: CAPPluginCall) {
        guard let ip = call.getString("ip"), validIP(ip) else { call.reject("Enter a private IPv4 address", "INVALID_INPUT"); return }
        var address = in_addr(); _ = inet_pton(AF_INET, ip, &address)
        withWiFi(call, notFound: "No PlayStation answered at \(ip). Turn on the PS5, enable Remote Play and use the same Wi-Fi.") {
            try self.search(destinations: [address.s_addr], broadcast: false, duration: 3)
        }
    }
    private func withWiFi(_ call: CAPPluginCall, notFound: String? = nil, _ work: @escaping () throws -> [[String: String]]) {
        // Network.framework checks the path; BSD UDP is used for discovery packets.
        let monitor = NWPathMonitor(requiredInterfaceType: .wifi)
        monitor.pathUpdateHandler = { [weak self] path in
            monitor.cancel()
            guard let self = self else { return }
            guard path.status == .satisfied else { call.reject("Connect your iPhone to Wi-Fi", "NO_WIFI"); return }
            self.queue.async {
                do {
                    let consoles = try work()
                    if let notFound = notFound, consoles.isEmpty { call.reject(notFound, "CONSOLE_NOT_FOUND"); return }
                    call.resolve(["consoles": consoles])
                } catch let error as NSError where error.code == 6 {
                    call.reject("Could not send to the local network. Allow Local Network access for MZGTA in iPhone Settings.", "LOCAL_NETWORK_DENIED")
                } catch {
                    call.reject("Local network search failed. Check Wi-Fi and Local Network permission.", "DISCOVERY_FAILED")
                }
            }
        }
        monitor.start(queue: queue)
    }
    private func broadcastAddresses() throws -> [UInt32] {
        var interfaces: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&interfaces) == 0 else { throw NSError(domain: "MZGTA", code: 4) }
        defer { freeifaddrs(interfaces) }
        var broadcasts = Set<UInt32>(); var cursor = interfaces
        while let item = cursor {
            defer { cursor = item.pointee.ifa_next }
            guard String(cString: item.pointee.ifa_name) == "en0", let address = item.pointee.ifa_addr, let mask = item.pointee.ifa_netmask, address.pointee.sa_family == sa_family_t(AF_INET) else { continue }
            let ip = UnsafeRawPointer(address).assumingMemoryBound(to: sockaddr_in.self).pointee.sin_addr.s_addr
            let netmask = UnsafeRawPointer(mask).assumingMemoryBound(to: sockaddr_in.self).pointee.sin_addr.s_addr
            broadcasts.insert(ip | ~netmask)
        }
        guard !broadcasts.isEmpty else { throw NSError(domain: "MZGTA", code: 5) }
        return Array(broadcasts)
    }
    private func search(destinations: [UInt32], broadcast: Bool, duration: TimeInterval) throws -> [[String: String]] {
        let fd = Darwin.socket(AF_INET, SOCK_DGRAM, Int32(IPPROTO_UDP))
        guard fd >= 0 else { throw NSError(domain: "MZGTA", code: 1) }
        defer { Darwin.close(fd) }
        if broadcast {
            var enabled: Int32 = 1
            guard setsockopt(fd, SOL_SOCKET, SO_BROADCAST, &enabled, socklen_t(MemoryLayout<Int32>.size)) == 0 else { throw NSError(domain: "MZGTA", code: 2) }
        }
        var timeout = timeval(tv_sec: 0, tv_usec: 200_000)
        _ = setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, socklen_t(MemoryLayout<timeval>.size))
        var local = sockaddr_in(); local.sin_len = UInt8(MemoryLayout<sockaddr_in>.size); local.sin_family = sa_family_t(AF_INET); local.sin_addr.s_addr = INADDR_ANY
        let bound = withUnsafePointer(to: &local) { $0.withMemoryRebound(to: sockaddr.self, capacity: 1) { bind(fd, $0, socklen_t(MemoryLayout<sockaddr_in>.size)) } }
        guard bound == 0 else { throw NSError(domain: "MZGTA", code: 3) }
        let ps5 = Data("SRCH * HTTP/1.1\r\ndevice-discovery-protocol-version:00030010\r\n\r\n".utf8)
        let ps4 = Data("SRCH * HTTP/1.1\r\ndevice-discovery-protocol-version:00020020\r\n\r\n".utf8)
        let end = Date().addingTimeInterval(duration); var nextSend = Date.distantPast; var hosts = [String: [String: String]](); var sent = false
        while Date() < end {
            if Date() >= nextSend {
                for target in destinations {
                    for (port, packet) in [(UInt16(9302), ps5), (UInt16(987), ps4)] {
                        var destination = sockaddr_in(); destination.sin_len = UInt8(MemoryLayout<sockaddr_in>.size); destination.sin_family = sa_family_t(AF_INET); destination.sin_port = port.bigEndian; destination.sin_addr.s_addr = target
                        let n = packet.withUnsafeBytes { bytes in withUnsafePointer(to: &destination) { address in address.withMemoryRebound(to: sockaddr.self, capacity: 1) { sendto(fd, bytes.baseAddress, bytes.count, 0, $0, socklen_t(MemoryLayout<sockaddr_in>.size)) } } }
                        if n > 0 { sent = true }
                    }
                }
                nextSend = Date().addingTimeInterval(1)
            }
            var buffer = [UInt8](repeating: 0, count: 4096); var source = sockaddr_in(); var length = socklen_t(MemoryLayout<sockaddr_in>.size)
            let n = buffer.withUnsafeMutableBytes { bytes in withUnsafeMutablePointer(to: &source) { address in address.withMemoryRebound(to: sockaddr.self, capacity: 1) { recvfrom(fd, bytes.baseAddress, bytes.count, 0, $0, &length) } } }
            guard n > 0, let text = String(bytes: buffer.prefix(n), encoding: .utf8), text.hasPrefix("HTTP/1.1 200") || text.hasPrefix("HTTP/1.1 620") else { continue }
            var headers = [String: String]()
            for line in text.components(separatedBy: "\r\n").dropFirst() {
                let parts = line.split(separator: ":", maxSplits: 1)
                if parts.count == 2 { headers[String(parts[0]).lowercased()] = parts[1].trimmingCharacters(in: .whitespaces) }
            }
            guard let id = headers["host-id"], let name = headers["host-name"], let type = headers["host-type"], type == "PS5" || type == "PS4" else { continue }
            let ip = String(cString: inet_ntoa(source.sin_addr))
            hosts[id] = ["hostId": id, "hostName": name, "ip": ip, "type": type, "status": text.hasPrefix("HTTP/1.1 200") ? "ready" : "standby"]
        }
        guard sent else { throw NSError(domain: "MZGTA", code: 6) }
        return hosts.values.sorted { ($0["hostName"] ?? "") < ($1["hostName"] ?? "") }
    }
    private func validIP(_ ip: String) -> Bool {
        var address = in_addr()
        guard inet_pton(AF_INET, ip, &address) == 1 else { return false }
        let number = UInt32(bigEndian: address.s_addr)
        return (number >> 24 == 10) || (number >> 20 == 0xac1) || (number >> 16 == 0xc0a8)
    }
    private func query(_ ip: String) -> [String: Any] {
        return [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: ip]
    }
    @objc func registerConsole(_ call: CAPPluginCall) {
        guard let ip = call.getString("ip"), validIP(ip), let pin = call.getString("pin"), pin.range(of: "^[0-9]{8}$", options: .regularExpression) != nil else {
            call.reject("Enter a private IPv4 address and eight-digit PIN", "INVALID_INPUT"); return
        }
        // accountId is optional: use the Sony-signed-in account from Keychain, else eight zero bytes.
        var accountData = storedAccountId() ?? Data(count: 8)
        if let account = call.getString("accountId"), !account.isEmpty {
            guard let decoded = Data(base64Encoded: account), decoded.count == 8 else {
                call.reject("accountId must be a base64 eight-byte PSN account ID", "INVALID_INPUT"); return
            }
            accountData = decoded
        }
        queue.async {
            do {
                // NSError** imports this nullable Objective-C result as a
                // nonoptional throwing Swift return: nil becomes an error.
                let record = try MZGTARegistration.registerHost(ip, pin: pin, accountID: accountData)
                let data = try PropertyListSerialization.data(fromPropertyList: record, format: .binary, options: 0)
                var item = self.query(ip); item[kSecValueData as String] = data; item[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
                var status = SecItemAdd(item as CFDictionary, nil)
                if status == errSecDuplicateItem { status = SecItemUpdate(self.query(ip) as CFDictionary, [kSecValueData as String: data] as CFDictionary) }
                guard status == errSecSuccess else { call.reject("Registration succeeded but Keychain storage failed", "KEYCHAIN_FAILED"); return }
                call.resolve(["registered": true, "ip": ip, "nickname": record["nickname"] as? String ?? "PS5"])
            } catch { call.reject("PS5 registration failed. Check the current PIN, Remote Play settings and Wi-Fi.", "REGISTRATION_FAILED") }
        }
    }
    @objc func getRegistration(_ call: CAPPluginCall) {
        guard let ip = call.getString("ip"), validIP(ip) else { call.reject("Invalid console IP", "INVALID_INPUT"); return }
        var item = query(ip); item[kSecReturnData as String] = true
        var value: CFTypeRef?
        let status = SecItemCopyMatching(item as CFDictionary, &value)
        guard status == errSecSuccess,
              let data = value as? Data,
              let propertyList = try? PropertyListSerialization.propertyList(from: data, options: [], format: nil),
              let record = propertyList as? [String: Any] else {
            call.resolve(["registered": false, "ip": ip]); return
        }
        call.resolve(["registered": true, "ip": ip, "nickname": record["nickname"] as? String ?? "PS5"])
    }
    @objc func removeRegistration(_ call: CAPPluginCall) {
        guard let ip = call.getString("ip"), validIP(ip) else { call.reject("Invalid console IP", "INVALID_INPUT"); return }
        let status = SecItemDelete(query(ip) as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else { call.reject("Could not delete registration", "KEYCHAIN_FAILED"); return }
        call.resolve(["removed": true])
    }

    // MARK: - Official Sony sign-in (same OAuth flow PS Remote Play / Chiaki use).
    // The password is typed only on Sony's page; the app keeps just the numeric account ID.
    private static let psnClientId = "ba495a24-818c-472b-b12d-ff231c1b5745"
    private static let psnClientSecret = "mvaiZkRsAsI1IBkY"
    private static let psnRedirect = "https://remoteplay.dl.playstation.net/remoteplay/redirect"
    private static let psnTokenURL = "https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/token"
    private var accountQuery: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service, kSecAttrAccount as String: "psn-account-id"]
    }
    private func storedAccountId() -> Data? {
        var item = accountQuery; item[kSecReturnData as String] = true
        var value: CFTypeRef?
        guard SecItemCopyMatching(item as CFDictionary, &value) == errSecSuccess, let data = value as? Data, data.count == 8 else { return nil }
        return data
    }
    @objc func getPSNAccount(_ call: CAPPluginCall) {
        call.resolve(["signedIn": storedAccountId() != nil])
    }
    @objc func signOutPSN(_ call: CAPPluginCall) {
        SecItemDelete(accountQuery as CFDictionary)
        call.resolve(["signedIn": false])
    }
    @objc func signInPSN(_ call: CAPPluginCall) {
        var components = URLComponents(string: "https://auth.api.sonyentertainmentnetwork.com/2.0/oauth/authorize")!
        components.queryItems = [
            URLQueryItem(name: "service_entity", value: "urn:service-entity:psn"),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "client_id", value: Self.psnClientId),
            URLQueryItem(name: "redirect_uri", value: Self.psnRedirect),
            URLQueryItem(name: "scope", value: "psn:clientapp"),
            URLQueryItem(name: "request_locale", value: "ar"),
            URLQueryItem(name: "ui", value: "pr"),
            URLQueryItem(name: "service_logo", value: "ps"),
            URLQueryItem(name: "layout_type", value: "popup"),
            URLQueryItem(name: "smcid", value: "remoteplay"),
            URLQueryItem(name: "prompt", value: "always"),
            URLQueryItem(name: "PlatformPrivacyWs1", value: "minimal")
        ]
        guard let url = components.url else { call.reject("Bad sign-in URL", "PSN_FAILED"); return }
        DispatchQueue.main.async {
            let controller = PSNLoginViewController(url: url, redirect: Self.psnRedirect) { [weak self] code in
                guard let self = self else { return }
                guard let code = code else { call.reject("Sign-in cancelled", "PSN_CANCELLED"); return }
                self.exchange(code: code, call: call)
            }
            let nav = UINavigationController(rootViewController: controller)
            nav.modalPresentationStyle = .fullScreen
            self.bridge?.viewController?.present(nav, animated: true)
        }
    }
    private func exchange(code: String, call: CAPPluginCall) {
        let basic = Data("\(Self.psnClientId):\(Self.psnClientSecret)".utf8).base64EncodedString()
        var request = URLRequest(url: URL(string: Self.psnTokenURL)!)
        request.httpMethod = "POST"
        request.setValue("Basic \(basic)", forHTTPHeaderField: "Authorization")
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        var form = URLComponents()
        form.queryItems = [URLQueryItem(name: "grant_type", value: "authorization_code"), URLQueryItem(name: "code", value: code),
                           URLQueryItem(name: "redirect_uri", value: Self.psnRedirect), URLQueryItem(name: "token_format", value: "jwt")]
        request.httpBody = form.percentEncodedQuery?.data(using: .utf8)
        URLSession.shared.dataTask(with: request) { data, _, _ in
            guard let data = data, let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
                  let token = json["access_token"] as? String,
                  let infoURL = URL(string: "\(Self.psnTokenURL)/\(token)") else {
                call.reject("Sony did not accept the sign-in", "PSN_FAILED"); return
            }
            var info = URLRequest(url: infoURL)
            info.setValue("Basic \(basic)", forHTTPHeaderField: "Authorization")
            URLSession.shared.dataTask(with: info) { data, _, _ in
                guard let data = data, let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] else {
                    call.reject("Could not read the PSN account", "PSN_FAILED"); return
                }
                let raw = json["user_id"]
                let idText = (raw as? String) ?? (raw as? NSNumber)?.stringValue ?? ""
                guard let id = UInt64(idText), id != 0 else { call.reject("Could not read the PSN account", "PSN_FAILED"); return }
                var little = id.littleEndian
                let bytes = Data(bytes: &little, count: 8)
                SecItemDelete(self.accountQuery as CFDictionary)
                var item = self.accountQuery; item[kSecValueData as String] = bytes
                item[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
                guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { call.reject("Keychain storage failed", "KEYCHAIN_FAILED"); return }
                call.resolve(["signedIn": true, "onlineId": json["online_id"] as? String ?? ""])
            }.resume()
        }.resume()
    }
}

/// Shows Sony's own login page and stops at the Remote Play redirect to read the one-time code.
final class PSNLoginViewController: UIViewController, WKNavigationDelegate {
    private let url: URL
    private let redirect: String
    private var completion: ((String?) -> Void)?
    init(url: URL, redirect: String, completion: @escaping (String?) -> Void) {
        self.url = url; self.redirect = redirect; self.completion = completion
        super.init(nibName: nil, bundle: nil)
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) is not used") }
    override func viewDidLoad() {
        super.viewDidLoad()
        title = "PlayStation"
        navigationItem.leftBarButtonItem = UIBarButtonItem(barButtonSystemItem: .cancel, target: self, action: #selector(cancel))
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        let web = WKWebView(frame: view.bounds, configuration: configuration)
        web.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        web.navigationDelegate = self
        view.addSubview(web)
        web.load(URLRequest(url: url))
    }
    @objc private func cancel() { finish(nil) }
    private func finish(_ code: String?) {
        let done = completion; completion = nil
        dismiss(animated: true) { done?(code) }
    }
    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let target = navigationAction.request.url, target.absoluteString.hasPrefix(redirect) {
            decisionHandler(.cancel)
            let code = URLComponents(url: target, resolvingAgainstBaseURL: false)?.queryItems?.first { $0.name == "code" }?.value
            finish(code)
            return
        }
        decisionHandler(.allow)
    }
}
