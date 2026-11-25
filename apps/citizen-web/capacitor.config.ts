import type { CapacitorConfig } from '@capacitor/cli';

const serverUrl = process.env.CAPACITOR_SERVER_URL || 'https://torbat.digiral.ir';

const config: CapacitorConfig = {
  appId: 'ir.digiral.torbatino',
  appName: 'تربتینو',
  webDir: 'dist',
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: 'https',
    errorPath: 'offline.html',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#FAF8FC',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#64158C',
      overlaysWebView: false,
    },
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
