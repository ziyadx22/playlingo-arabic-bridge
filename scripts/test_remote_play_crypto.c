// SPDX-License-Identifier: AGPL-3.0-only
// Known-answer fixtures from Chiaki v1.0.0 test/rpcrypt.c (same license).
#include <chiaki/regist.h>
#include <chiaki/rpcrypt.h>
#include <assert.h>
#include <stdio.h>
#include <string.h>
int main(void) {
    const uint8_t ambassador[] = {0x3e,0x7e,0x7a,0x82,0x59,0x73,0xad,0xab,0x2f,0x69,0x43,0x46,0xbd,0x44,0xda,0xb5};
    const uint8_t iv_expected[] = {0x90,0x44,0x40,0x82,0x73,0xf8,0x04,0x4d,0xca,0x76,0x7b,0x5a,0x16,0x39,0x4d,0x64};
    ChiakiRPCrypt crypt; uint8_t iv[16];
    assert(chiaki_rpcrypt_init_regist(&crypt, CHIAKI_TARGET_PS5_1, ambassador, 0, 0) == CHIAKI_ERR_SUCCESS);
    assert(chiaki_rpcrypt_generate_iv(&crypt, iv, 0) == CHIAKI_ERR_SUCCESS);
    assert(memcmp(iv, iv_expected, sizeof(iv)) == 0);
    const uint8_t another[] = {0xdc,0xa1,0xc8,0x4d,0xfe,0x50,0xd6,0x57,0x22,0xda,0x09,0x65,0x42,0x31,0xe7,0xc2};
    const uint8_t bright_expected[] = {0xe2,0x9d,0x64,0x4c,0x14,0x1b,0x9d,0x61,0x74,0x31,0xa5,0x6d,0x34,0xcf,0xc1,0x7f};
    assert(chiaki_rpcrypt_init_regist(&crypt, CHIAKI_TARGET_PS5_1, another, 0x1e, 78703893) == CHIAKI_ERR_SUCCESS);
    assert(memcmp(crypt.bright, bright_expected, sizeof(bright_expected)) == 0);
    const uint8_t account_id[] = {1,2,3,4,5,6,7,8};
    uint8_t payload[1024] = {0}; size_t size = sizeof(payload);
    assert(chiaki_regist_request_payload_format(CHIAKI_TARGET_PS5_1, ambassador, payload, &size, &crypt, NULL, account_id, 12345678) == CHIAKI_ERR_SUCCESS);
    assert(size > 0x1e0);
    assert(chiaki_rpcrypt_decrypt(&crypt, 0, payload + 0x1e0, payload + 0x1e0, size - 0x1e0) == CHIAKI_ERR_SUCCESS);
    payload[size] = 0;
    assert(strstr((char *)payload + 0x1e0, "Np-AccountId: AQIDBAUGBwg=\r\n") != NULL);
    // A PIN change must change the derived key, not silently accept any eight digits.
    ChiakiRPCrypt other; size = sizeof(payload);
    assert(chiaki_regist_request_payload_format(CHIAKI_TARGET_PS5_1, ambassador, payload, &size, &other, NULL, account_id, 12345679) == CHIAKI_ERR_SUCCESS);
    assert(memcmp(crypt.bright, other.bright, sizeof(crypt.bright)) != 0);
    puts("PS5 IV, key derivation, encrypted account-ID payload and PIN sensitivity passed");
    return 0;
}
