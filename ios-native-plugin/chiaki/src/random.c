// SPDX-License-Identifier: AGPL-3.0-only
// MZGTA Apple platform adaptation, 2026-11-26. No weak RNG fallback.
#include <chiaki/random.h>
#include <limits.h>
#ifdef __APPLE__
#include <Security/SecRandom.h>
#else
#include <openssl/rand.h>
#endif
ChiakiErrorCode chiaki_random_bytes_crypt(uint8_t *buf, size_t size) {
#ifdef __APPLE__
    return SecRandomCopyBytes(kSecRandomDefault, size, buf) == errSecSuccess ? CHIAKI_ERR_SUCCESS : CHIAKI_ERR_UNKNOWN;
#else
    return size <= INT_MAX && RAND_bytes(buf, (int)size) == 1 ? CHIAKI_ERR_SUCCESS : CHIAKI_ERR_UNKNOWN;
#endif
}
uint32_t chiaki_random_32(void) {
    uint32_t result = 0;
    if(chiaki_random_bytes_crypt((uint8_t *)&result, sizeof(result)) != CHIAKI_ERR_SUCCESS) abort();
    return result;
}
