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
};

export default config;
