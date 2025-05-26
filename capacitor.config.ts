import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'FinalsP',
  webDir: 'www',
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      showDuration: 3000, // milliseconds
      backgroundColor: "#121212", // Match your app background
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true
    }
  }
};

export default config;
