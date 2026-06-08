// Importing 'react-native' makes this file a module, so the `declare module`
// below is treated as a *module augmentation* that MERGES with React Native's
// real types. Without this import the file is a global script and the
// declaration REPLACES the react-native module — wiping out View, Text,
// Platform, TextProps, etc. and causing cascading "no exported member" /
// "Property 'style' does not exist" errors across the app.
import 'react-native';

declare module 'react-native' {
  export interface EventSubscriptionVendor {
    addSubscription(eventType: string, subscription: any): any;
  }
}
