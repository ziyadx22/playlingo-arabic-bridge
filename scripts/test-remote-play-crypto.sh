#!/bin/sh
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OUT=$(mktemp -d)
trap 'rm -rf "$OUT"' EXIT
if [ "$(uname -s)" = Darwin ]; then
  FLAGS="-DCHIAKI_APPLE_CRYPTO=1"
  LIBS="-framework Security"
else
  FLAGS="$(pkg-config --cflags openssl) -D_GNU_SOURCE"
  LIBS="$(pkg-config --libs openssl) -lpthread"
fi
cc -std=c11 $FLAGS -I"$ROOT/ios-native-plugin/chiaki/include" \
  "$ROOT/scripts/test_remote_play_crypto.c" "$ROOT"/ios-native-plugin/chiaki/src/*.c \
  $LIBS -o "$OUT/protocol-test"
"$OUT/protocol-test"
