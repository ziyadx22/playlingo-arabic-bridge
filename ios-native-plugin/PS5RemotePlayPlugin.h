#import <Foundation/Foundation.h>
@interface MZGTARegistration : NSObject
+ (NSDictionary * _Nullable)registerHost:(NSString * _Nonnull)host pin:(NSString * _Nonnull)pin accountID:(NSData * _Nonnull)accountID error:(NSError * _Nullable * _Nullable)error;
@end
