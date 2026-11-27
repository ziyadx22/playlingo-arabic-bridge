import Foundation
import Capacitor
@objc(MZGTABridgeViewController)
final class MZGTABridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        // configure-native.py also lists both classes in capacitor.config.json's
        // packageClassList; register here only if that auto-registration missed them.
        // PS5 pairing is always exposed: builds without the multicast entitlement
        // only lose broadcast discovery (MZGTAPS5Discovery=false), not unicast pairing.
        if bridge?.plugin(withName: "PS5RemotePlay") == nil {
            bridge?.registerPluginInstance(PS5RemotePlayPlugin())
        }
        if bridge?.plugin(withName: "MZGTACapture") == nil {
            bridge?.registerPluginInstance(ScreenCapturePlugin())
        }
    }
}
