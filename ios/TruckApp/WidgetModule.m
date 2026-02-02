#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetModule, NSObject)

RCT_EXTERN_METHOD(updateWidgetData:(NSDictionary *)data)
RCT_EXTERN_METHOD(setLoggedIn:(BOOL)isLoggedIn)
RCT_EXTERN_METHOD(reloadWidget)

@end
