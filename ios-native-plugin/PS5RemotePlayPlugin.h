#import <Foundation/Foundation.h>
#pragma once
NS_ASSUME_NONNULL_BEGIN
@interface MZGTARegistration : NSObject
+ (nullable NSDictionary<NSString *, id> *)registerHost:(NSString *)host pin:(NSString *)pin accountID:(NSData *)accountID error:(NSError * _Nullable * _Nullable)error;
@end
NS_ASSUME_NONNULL_END
