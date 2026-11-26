import Foundation
import Capacitor
@objc(MZGTABridgeViewController)
final class MZGTABridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(PS5RemotePlayPlugin())
        bridge?.registerPluginInstance(ScreenCapturePlugin())
    }
}
