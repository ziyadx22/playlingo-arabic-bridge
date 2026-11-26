// SPDX-License-Identifier: AGPL-3.0-only
import Foundation
import Capacitor
import Network
import Security
import Darwin

@objc(PS5RemotePlayPlugin)
public final class PS5RemotePlayPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PS5RemotePlayPlugin"
    public let jsName = "PS5RemotePlay"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "discoverConsoles", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "registerConsole", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getRegistration", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "removeRegistration", returnType: CAPPluginReturnPromise)
    ]
    private let queue = DispatchQueue(label: "com.mzgta.remoteplay", qos: .userInitiated)
    private let service = "com.mzgta.remoteplay.keys"

    @objc func discoverConsoles(_ call: CAPPluginCall) {
        // Network.framework checks the path; BSD UDP is required for SO_BROADCAST.
        let monitor = NWPathMonitor(requiredInterfaceType: .wifi)
        monitor.pathUpdateHandler = { [weak self] path in
            monitor.cancel()
            guard let self = self else { return }
            guard path.status == .satisfied else { call.reject("Connect your iPhone to Wi-Fi", "NO_WIFI"); return }
            self.queue.async {
                do { call.resolve(["consoles": try self.discover()]) }
                catch { call.reject("Local network discovery failed. Check Local Network permission and multicast entitlement.", "DISCOVERY_FAILED") }
            }
        }
        monitor.start(queue: queue)
    }
    private func discover() throws -> [[String: String]] {
        let fd = Darwin.socket(AF_INET, SOCK_DGRAM, Int32(IPPROTO_UDP))
        guard fd >= 0 else { throw NSError(domain: "MZGTA", code: 1) }
        defer { Darwin.close(fd) }
        var enabled: Int32 = 1
        guard setsockopt(fd, SOL_SOCKET, SO_BROADCAST, &enabled, socklen_t(MemoryLayout<Int32>.size)) == 0 else { throw NSError(domain: "MZGTA", code: 2) }
        var timeout = timeval(tv_sec: 0, tv_usec: 200_000)
        _ = setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, socklen_t(MemoryLayout<timeval>.size))
        var local = sockaddr_in(); local.sin_len = UInt8(MemoryLayout<sockaddr_in>.size); local.sin_family = sa_family_t(AF_INET); local.sin_addr.s_addr = INADDR_ANY
        let bound = withUnsafePointer(to: &local) { $0.withMemoryRebound(to: sockaddr.self, capacity: 1) { bind(fd, $0, socklen_t(MemoryLayout<sockaddr_in>.size)) } }
        guard bound == 0 else { throw NSError(domain: "MZGTA", code: 3) }
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
        let ps5 = Data("SRCH * HTTP/1.1\r\ndevice-discovery-protocol-version:00030010\r\n\r\n".utf8)
        let ps4 = Data("SRCH * HTTP/1.1\r\ndevice-discovery-protocol-version:00020020\r\n\r\n".utf8)
        let end = Date().addingTimeInterval(4); var nextSend = Date.distantPast; var hosts = [String: [String: String]](); var sent = false
        while Date() < end {
            if Date() >= nextSend {
                for broadcast in broadcasts {
                    for (port, packet) in [(UInt16(9302), ps5), (UInt16(987), ps4)] {
                        var destination = sockaddr_in(); destination.sin_len = UInt8(MemoryLayout<sockaddr_in>.size); destination.sin_family = sa_family_t(AF_INET); destination.sin_port = port.bigEndian; destination.sin_addr.s_addr = broadcast
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
        guard let ip = call.getString("ip"), validIP(ip), let pin = call.getString("pin"), pin.range(of: "^[0-9]{8}$", options: .regularExpression) != nil, let account = call.getString("accountId"), let accountData = Data(base64Encoded: account), accountData.count == 8 else {
            call.reject("Enter a private IPv4 address, eight-digit PIN, and base64 eight-byte PSN account ID", "INVALID_INPUT"); return
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
            } catch { call.reject("PS5 registration failed. Check the current PIN, account ID, Remote Play settings and Wi-Fi.", "REGISTRATION_FAILED") }
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
}
