import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Network } from '@capacitor/network';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

let initialized = false;

function showToast(text: string) {
  const existing = document.getElementById('torbatino-native-toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'torbatino-native-toast';
  el.textContent = text;
  Object.assign(el.style, {
    position: 'fixed',
    bottom: '86px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#24202a',
    color: '#fff',
    padding: '10px 18px',
    borderRadius: '999px',
    fontSize: '13px',
    zIndex: '9999',
    boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
    whiteSpace: 'nowrap',
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

function setOfflineBanner(offline: boolean) {
  const id = 'torbatino-offline-banner';
  const existing = document.getElementById(id);
  if (!offline) {
    existing?.remove();
    return;
  }
  if (existing) return;
  const bar = document.createElement('div');
  bar.id = id;
  bar.setAttribute('role', 'alert');
  bar.textContent = 'اتصال اینترنت قطع شده است. پس از برقراری اتصال دوباره تلاش کنید.';
  Object.assign(bar.style, {
    position: 'sticky',
    top: '0',
    zIndex: '9998',
    background: '#fff4d9',
    color: '#6b4900',
    borderBottom: '1px solid #f5ae16',
    padding: '8px 14px',
    fontSize: '12px',
    fontWeight: '700',
    textAlign: 'center',
  });
  document.body.prepend(bar);
}

export async function initNativeApp() {
  if (initialized || !Capacitor.isNativePlatform()) return;
  initialized = true;

  try {
    await StatusBar.setBackgroundColor({ color: '#64158C' });
    await StatusBar.setStyle({ style: Style.Light });
  } catch {
    // Ignore on platforms where StatusBar is unavailable
  }

  try {
    await SplashScreen.hide();
  } catch {
    // Ignore
  }

  // Network status banner
  try {
    const status = await Network.getStatus();
    setOfflineBanner(!status.connected);
    await Network.addListener('networkStatusChange', (s) => setOfflineBanner(!s.connected));
  } catch {
    // Ignore
  }

  // Hardware Back button: navigate history or confirm exit on double tap
  let lastBack = 0;
  await App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack && window.location.pathname !== '/') {
      window.history.back();
      return;
    }
    const now = Date.now();
    if (now - lastBack < 2000) {
      void App.exitApp();
    } else {
      lastBack = now;
      showToast('برای خروج دوباره دکمه بازگشت را بزنید');
    }
  });

  // Open external links in in-app custom tab browser while keeping torbat.digiral.ir internal
  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const anchor = target?.closest('a[href]') as HTMLAnchorElement | null;
    if (!anchor) return;
    const href = anchor.getAttribute('href') ?? '';
    if (!href.startsWith('http://') && !href.startsWith('https://')) return;
    try {
      const url = new URL(href);
      if (url.hostname === window.location.hostname || url.hostname === 'torbat.digiral.ir') return;
      event.preventDefault();
      void Browser.open({ url: href });
    } catch {
      // Ignore invalid URLs
    }
  });
}
