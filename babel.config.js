// Pick the env file based on NODE_ENV at build time.
//   development build (default for `react-native run-android`)  -> .env.development (local backend)
//   production build   (`run-android --variant=release`, bundle) -> .env.production (api.truckast.ai)
// This avoids having to manually edit .env when switching between
// local testing and a release build. Each file must contain ALL keys
// that the app reads from `@env` — they're currently in sync.
const ENV_FILE =
  process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: ENV_FILE,
        safe: false,
        allowUndefined: true,
        verbose: false,
      },
    ],
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@api': './src/api',
          '@assets': './src/assets',
          '@icons': './src/assets/icons',
          '@images': './src/assets/images',
          '@fonts': './src/assets/fonts',
          '@components': './src/components',
          '@contexts': './src/contexts',
          '@hooks': './src/hooks',
          '@locales': './src/locales',
          '@navigation': './src/navigation',
          '@screens': './src/screens',
          '@services': './src/services',
          '@store': './src/store',
          '@theme': './src/theme',
          '@types': './src/types',
          '@utils': './src/utils',
        },
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
