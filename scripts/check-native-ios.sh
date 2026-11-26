#!/bin/sh
# Apple-toolchain preflight; final Capacitor integration is compiled by xcodebuild.
set -eu
IOS_ROOT=${1:-ios}
SDK=$(xcrun --sdk iphoneos --show-sdk-path)
NATIVE="$IOS_ROOT/App/App/Native"
HEADER="$IOS_ROOT/App/App/App-Bridging-Header.h"
OUT=$(mktemp -d)
trap 'rm -rf "$OUT"' EXIT
test -f "$HEADER"

# Run each unit through a loop: unlike find -exec, set -e propagates failures.
find "$NATIVE" "$IOS_ROOT/App/MZGTABroadcast" -type f -name '*.swift' > "$OUT/swift-files"
while IFS= read -r source; do
  xcrun --sdk iphoneos swiftc -frontend -parse -swift-version 5 \
    -sdk "$SDK" -target arm64-apple-ios15.0 "$source"
done < "$OUT/swift-files"

find "$NATIVE" -type f \( -name '*.c' -o -name '*.m' \) > "$OUT/c-files"
while IFS= read -r source; do
  case "$source" in
    *.m) xcrun --sdk iphoneos clang -fsyntax-only -fobjc-arc -fmodules \
      -isysroot "$SDK" -target arm64-apple-ios15.0 \
      -I"$NATIVE/chiaki/include" "$source" ;;
    *.c) xcrun --sdk iphoneos clang -fsyntax-only -std=c11 \
      -DCHIAKI_APPLE_CRYPTO=1 -isysroot "$SDK" -target arm64-apple-ios15.0 \
      -I"$NATIVE/chiaki/include" "$source" ;;
  esac
done < "$OUT/c-files"

# Real Apple Clang-importer regression check: NSError** removes optionality
# from the Objective-C return. Also validate Darwin's socket argument types.
cat > "$OUT/BridgeContract.swift" <<'SWIFT'
import Foundation
import Darwin
func verifyRegistrationBridge(_ host: String, _ pin: String, _ accountID: Data) throws -> [String: Any] {
    let record: [String: Any] = try MZGTARegistration.registerHost(host, pin: pin, accountID: accountID)
    return record
}
func verifySocketSignature() -> Int32 {
    return Darwin.socket(AF_INET, SOCK_DGRAM, Int32(IPPROTO_UDP))
}
SWIFT
xcrun --sdk iphoneos swiftc -typecheck -swift-version 5 \
  -sdk "$SDK" -target arm64-apple-ios15.0 \
  -import-objc-header "$HEADER" "$OUT/BridgeContract.swift"
echo "App and broadcast Swift syntax, C/Objective-C, and Apple bridge preflight passed"