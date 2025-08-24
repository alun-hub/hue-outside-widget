import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.9ac765a1da2546ffba0b8da25fc8d73a',
  appName: 'Hue Temperature Widget',
  webDir: 'dist',
  server: {
    url: "https://9ac765a1-da25-46ff-ba0b-8da25fc8d73a.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1a1a2e",
      showSpinner: false
    }
  }
};

export default config;