// SPDX-License-Identifier: AGPL-3.0-only
#import "PS5RemotePlayPlugin.h"
#import <chiaki/regist.h>
#import <dispatch/dispatch.h>
#include <string.h>

typedef struct {
    dispatch_semaphore_t semaphore;
    BOOL success;
    ChiakiRegisteredHost host;
} MZGTARegistResult;
static void MZGTARegistCallback(ChiakiRegistEvent *event, void *user) {
    MZGTARegistResult *result = user;
    result->success = event->type == CHIAKI_REGIST_EVENT_TYPE_FINISHED_SUCCESS && event->registered_host != NULL;
    if(result->success) result->host = *event->registered_host;
    dispatch_semaphore_signal(result->semaphore);
}
@implementation MZGTARegistration
+ (NSDictionary *)registerHost:(NSString *)host pin:(NSString *)pin accountID:(NSData *)accountID error:(NSError **)error {
    if(accountID.length != CHIAKI_PSN_ACCOUNT_ID_SIZE || pin.length != 8) {
        if(error) *error = [NSError errorWithDomain:@"MZGTA" code:1 userInfo:@{NSLocalizedDescriptionKey: @"Invalid account ID or PIN"}];
        return nil;
    }
    ChiakiRegistInfo info = {0};
    info.target = CHIAKI_TARGET_PS5_1; info.host = host.UTF8String; info.broadcast = false;
    info.psn_online_id = NULL; info.pin = (uint32_t)pin.intValue;
    memcpy(info.psn_account_id, accountID.bytes, CHIAKI_PSN_ACCOUNT_ID_SIZE);
    // No protocol logs: upstream debug output contains key material.
    MZGTARegistResult result = { .semaphore = dispatch_semaphore_create(0), .success = NO };
    ChiakiRegist regist;
    ChiakiLog silentLog = { .level_mask = 0, .cb = NULL, .user = NULL };
    ChiakiErrorCode status = chiaki_regist_start(&regist, &silentLog, &info, MZGTARegistCallback, &result);
    memset(info.psn_account_id, 0, sizeof(info.psn_account_id));
    if(status != CHIAKI_ERR_SUCCESS) {
        if(error) *error = [NSError errorWithDomain:@"MZGTA" code:status userInfo:@{NSLocalizedDescriptionKey: @"Could not start PS5 registration"}];
        return nil;
    }
    if(dispatch_semaphore_wait(result.semaphore, dispatch_time(DISPATCH_TIME_NOW, 15 * NSEC_PER_SEC)) != 0) chiaki_regist_stop(&regist);
    chiaki_regist_fini(&regist); // joins callback thread before result leaves scope
    if(!result.success) {
        if(error) *error = [NSError errorWithDomain:@"MZGTA" code:2 userInfo:@{NSLocalizedDescriptionKey: @"PS5 rejected registration or did not respond. Check PIN, account ID, Remote Play and Wi-Fi."}];
        memset(&result.host, 0, sizeof(result.host));
        return nil;
    }
    NSString *nickname = [[NSString alloc] initWithBytes:result.host.server_nickname length:strnlen(result.host.server_nickname, sizeof(result.host.server_nickname)) encoding:NSUTF8StringEncoding] ?: @"PS5";
    NSDictionary *record = @{
        @"nickname": nickname,
        @"rpKey": [NSData dataWithBytes:result.host.rp_key length:sizeof(result.host.rp_key)],
        @"registrationKey": [NSData dataWithBytes:result.host.rp_regist_key length:sizeof(result.host.rp_regist_key)],
        @"keyType": @(result.host.rp_key_type),
        @"serverMac": [NSData dataWithBytes:result.host.server_mac length:sizeof(result.host.server_mac)]
    };
    memset(&result.host, 0, sizeof(result.host));
    return record; // stays native; Swift saves Keychain, never returned to JS
}
@end
