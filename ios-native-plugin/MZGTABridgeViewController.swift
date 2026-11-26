import Capacitor
@objc(MZGTABridgeViewController)
final class MZGTABridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(PS5RemotePlayPlugin())
    }
}
