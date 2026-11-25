# راهنمای ساخت و انتشار نسخه اندروید تربتینو (APK)

این پروژه با **Capacitor 8** روی اپلیکیشن شهروندی (`apps/citizen-web`) برای اندروید پیکربندی شده است.

## مشخصات اپلیکیشن
- **نام فارسی:** تربتینو
- **نام انگلیسی:** TORBATINO
- **شناسه پکیج (Application ID):** `ir.digiral.torbatino`
- **حداقل نسخه اندروید:** Android 7.0 (`minSdkVersion = 24`)
- **نسخه هدف:** Android 16 (`targetSdkVersion = 36`)
- **سرور متصل:** `https://torbat.digiral.ir` (HTTPS + حفظ نشست با کوکی امن + صفحه خطای آفلاین `offline.html`)
- **قابلیت‌های نیتیو پیاده‌سازی‌شده:**
  - Splash Screen اختصاصی با لوگوی رسمی تربتینو (`#FAF8FC`)
  - آیکن‌های رسمی لانچر در تمام چگالی‌ها (`mipmap-mdpi` تا `xxxhdpi`)
  - نوار وضعیت هماهنگ با رنگ برند (`#64158C`)
  - مدیریت دکمه Back گوشی (بازگشت در تاریخچه و خروج با دو بار لمس)
  - بنر زنده وضعیت اینترنت (`@capacitor/network`) و صفحه خطای آفلاین
  - باز شدن لینک‌های داخلی در خود اپلیکیشن و لینک‌های خارجی در Custom Tab (`@capacitor/browser`)
  - مجوزهای دوربین و مکان برای مطالبه شهری و نقشه و `adjustResize` برای صفحه‌کلید فرم‌ها

---

## پیش‌نیازهای ساخت محلی APK
1. **JDK 21** (مثلاً Eclipse Temurin 21) و تنظیم `JAVA_HOME`
2. **Android SDK** (`platforms;android-36` و `build-tools;36.0.0`) و تنظیم `ANDROID_HOME`

---

## ۱. ساخت Debug APK
از ریشه پروژه اجرا کنید:

```powershell
pnpm --filter @torbat/citizen-web run build
cd apps/citizen-web
pnpm exec cap sync android
cd android
.\gradlew.bat assembleDebug
```

خروجی ساخته شده در مسیر زیر قرار می‌گیرد:
`apps/citizen-web/android/app/build/outputs/apk/debug/app-debug.apk`

کپی در پوشه تحویل:
```powershell
New-Item -ItemType Directory -Force release | Out-Null
Copy-Item apps/citizen-web/android/app/build/outputs/apk/debug/app-debug.apk release/torbatino-debug.apk
```

---

## ۲. ساخت امن Release APK (امضاشده)

**هشدار امنیتی:** هرگز فایل کلید (`.jks` / `.keystore`) یا رمز آن را وارد Git نکنید.

### گام اول: ساخت کلید امضا (یک‌بار، خارج از مخزن)
```powershell
keytool -genkeypair -v -keystore C:\secure\torbatino-release.jks -alias torbatino -keyalg RSA -keysize 2048 -validity 10000
```

### گام دوم: ساخت خروجی Release و امضا
```powershell
cd apps/citizen-web/android
.\gradlew.bat assembleRelease `
  -Pandroid.injected.signing.store.file=C:\secure\torbatino-release.jks `
  -Pandroid.injected.signing.store.password=<STORE_PASSWORD> `
  -Pandroid.injected.signing.key.alias=torbatino `
  -Pandroid.injected.signing.key.password=<KEY_PASSWORD>
```

یا استفاده از `apksigner` روی `app-release-unsigned.apk` و کپی خروجی نهایی در:
`release/torbatino-release.apk`

---

## ۳. ساخت خودکار در GitHub Actions
ورک‌فلو [`.github/workflows/android-apk.yml`](../../.github/workflows/android-apk.yml) برای ساخت خودکار `torbatino-debug.apk` در GitHub Actions آماده شده است.
