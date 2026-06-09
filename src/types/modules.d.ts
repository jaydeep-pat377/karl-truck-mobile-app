// Ambient module / global declarations for packages and runtime globals that
// don't ship their own TypeScript types (or whose types don't resolve under
// this project's moduleResolution).

// react-native-vector-icons icon sets ship without bundled types.
declare module 'react-native-vector-icons/MaterialCommunityIcons';

// crypto-js has no bundled types in this install.
declare module 'crypto-js';

// SVG files imported as React components via react-native-svg-transformer.
declare module '*.svg' {
  import * as React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

// @noble/hashes subpath export doesn't resolve under the current
// moduleResolution; declare the one symbol we use.
declare module '@noble/hashes/sha2' {
  export function sha256(data: Uint8Array): Uint8Array;
}

// Web/runtime globals polyfilled by React Native but absent from the TS lib set.
declare function btoa(data: string): string;
declare class TextEncoder {
  encode(input?: string): Uint8Array;
}
