declare module 'react-native' {
  export interface EventSubscriptionVendor {
    addSubscription(eventType: string, subscription: any): any;
  }
}
