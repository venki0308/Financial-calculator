import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fincalix.app',
  appName: 'FinCalix',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Ensures SPA routing works — all unknown paths fall back to index.html
    url: undefined,
  },
  android: {
    // Fill the area NOT covered by HTML content with the app's dark background.
    // Allow the native Activity background (which matches dark/light mode dynamically) to show through.
    backgroundColor: '#00000000',
    // captureInput: tells Capacitor to handle input events more aggressively,
    // preventing Android's native text selection layer from activating.
    captureInput: true,
    webContentsDebuggingEnabled: false,
    loggingBehavior: 'none' as any,
  },
};

export default config;
