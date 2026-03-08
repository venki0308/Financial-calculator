import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.venki0308.fincalix',
  appName: 'FinCalix',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Ensures SPA routing works — all unknown paths fall back to index.html
    url: undefined,
  },
};

export default config;
