import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.parivaar.vault',
  appName: 'Parivaar Vault',
  // Angular's application builder writes the web bundle to dist/<project>/browser.
  webDir: '../../dist/apps/parivaar-vault/browser',
  server: {
    androidScheme: 'https',
  },
};

export default config;
