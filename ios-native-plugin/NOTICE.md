# Native Remote Play engine

Registration uses the Chiaki/chiaki4deck v1.0.0 registration-only C engine,
from https://github.com/streetpea/chiaki4deck/tree/v1.0.0.
Upstream is **AGPL-3.0-only with an OpenSSL exception**, a GPL-family license
with source-offer obligations for network use. See chiaki/COPYING.
The complete upstream source archive is chiaki/upstream-v1.0.0.tar.gz.
MZGTA adapters and modifications are AGPL-3.0-only; their source is included.

Changes dated 2026-11-26: Apple CommonCrypto AES-CFB/HMAC backend, Security
random generator, registration-only support helpers, Capacitor bridge,
Keychain persistence, and native discovery. Protocol tables, request formats,
and response validation remain upstream. This is an encrypted HTTP registration
exchange on port 9295, not an invented HTTPS/TLS request.

This is NOT a video decoder or Remote Play streaming client. Registration does
not imply an active stream or live PS5 connection. Physical PS5 testing and Xcode
compilation are required; this Linux environment has neither an iOS SDK nor PS5.
iOS UDP broadcast additionally needs Apple's multicast entitlement in the signed
provisioning profile. The unsigned Codemagic output cannot grant that permission.
