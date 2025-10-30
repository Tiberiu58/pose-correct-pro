import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.a843401bd13e408a96af01d7e97b2ee3',
  appName: 'FitForm',
  webDir: 'dist',
  server: {
    url: 'https://a843401b-d13e-408a-96af-01d7e97b2ee3.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    Camera: {
      presentationStyle: 'fullscreen'
    }
  }
};

export default config;
