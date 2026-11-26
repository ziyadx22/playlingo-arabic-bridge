import Foundation
import Capacitor
@objc(MZGTABridgeViewController)
final class MZGTABridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        // Builds signed without Apple's multicast entitlement set MZGTAPS5Pairing=false;
        // the pairing code stays compiled but is not exposed to the app.
        if Bundle.main.object(forInfoDictionaryKey: "MZGTAPS5Pairing") as? Bool != false {
            bridge?.registerPluginInstance(PS5RemotePlayPlugin())
        }
        bridge?.registerPluginInstance(ScreenCapturePlugin())
    }
}
