# ساخت و استقرار

## استقرار مستقل روی سرور رشد

نسخه آزمایشی تربت من از منابع مستقل استفاده می‌کند: `/opt/torbat-man`، سرویس‌های `torbat-man-api` و `torbat-man-web`، کانتینر و volume اختصاصی PostgreSQL. پورت وب `127.0.0.1:4180`، API برابر `127.0.0.1:4181` و PostgreSQL برابر `127.0.0.1:5441` است. محدودیت CPU، RAM و تعداد پردازش اعمال می‌شود. هیچ فایل Nginx، سرویس PM2، دیتابیس یا پورت پروژه دیگر نباید تغییر کند.

بسته انتشار با `node scripts/package-release.mjs` از build و commit مشخص ساخته می‌شود. وابستگی‌های مستقیم runtime روی نسخه نصب‌شده pin می‌شوند؛ قبل از بسته‌بندی نهایی، داخل پوشه `api` بسته، `npm install --package-lock-only --ignore-scripts --omit=dev` اجرا شود. سپس بسته به مسیر releases منتقل و `infra/provision-private-demo.sh COMMIT_SHA` فقط برای نصب اولیه اجرا شود. این اسکریپت در صورت وجود منابع هم‌نام یا پورت اشغال‌شده متوقف می‌شود؛ secretها فقط روی سرور ساخته می‌شوند و در Git یا artifact قرار نمی‌گیرند.

دسترسی خصوصی، بدون تغییر فایروال یا Nginx:

```powershell
ssh -N -L 4180:127.0.0.1:4180 roshd
```

سپس `http://localhost:4180` و `http://localhost:4180/admin` را باز کنید. ورود و سازمان‌ها در این محیط آزمایشی‌اند؛ داده واقعی وارد نکنید. انتشار عمومی منوط به دامنه صحیح، TLS، سیاست دسترسی و غیرفعال‌کردن ورود آزمایشی عمومی است.

برای توقف فقط تربت من: `systemctl stop torbat-man-web torbat-man-api` و `docker stop torbat-man-postgres`. volume را حذف نکنید. برای مشاهده لاگ‌ها: `journalctl -u torbat-man-api -u torbat-man-web`. برای نسخه‌های بعد، release جدید با نگه‌داری shared data و backup مستقل منتشر شود؛ اسکریپت نصب اولیه برای به‌روزرسانی نیست.

## build و اجرا

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

خروجی‌ها: `apps/citizen-web/dist`، `apps/admin-web/dist` و `apps/api/dist`. پنل سازمانی در مسیر `/admin` اپ شهروندی نیز قابل دسترسی است؛ پنل مستقل build جدا دارد. فایل‌های API و پوشه `apps/api/drizzle` باید با هم منتقل شوند و وابستگی‌های runtime قابل resolve باشند.

API را از پوشه `apps/api` با `pnpm start` اجرا کنید. تنظیمات `.env` همان پوشه خوانده می‌شوند. در محیط عملیاتی:

- `NODE_ENV=production` و `APP_ENV=production`
- `DATABASE_URL` برای PostgreSQL مستقل
- دو secret تصادفی متفاوت برای `SESSION_SECRET` و `FILE_SIGNING_SECRET`
- `COOKIE_SECURE=true`، HTTPS و فهرست دقیق `APP_ORIGINS`
- مسیر پایدار و خصوصی `STORAGE_DIR` و سیاست backup/restore دیتابیس و فایل‌ها

در تولید، seed کاربران آزمایشی ممنوع است و فرمان seed آن را رد می‌کند. API بدون تنظیم سرویس پیامک، ورود واقعی ارائه نمی‌دهد؛ این محدودیت باید پیش از انتشار برطرف شود. استفاده از `APP_ENV=demo` و نمایش OTP فقط برای محیط آزمایشی کنترل‌شده با داده ساختگی مناسب است.

## reverse proxy

فایل‌های static را از `dist` سرو کنید. تمام درخواست‌های `/v1/*` و `/health` به API و `/openapi.json` در صورت نیاز به API پراکسی شوند. سایر مسیرها باید با fallback به `index.html` سرو شوند تا refresh مسیر پرونده و `/admin` درست باشد. محتوای API یا لینک امضاشده را روی CDN عمومی کش نکنید. کوکی‌ها، Origin و `Idempotency-Key` را حفظ کنید.

`vite preview` صرفاً برای بازبینی محلی build است و برای استقرار توصیه نمی‌شود. سرویس worker فقط پوسته عمومی را کش می‌کند؛ برای تست نصب، HTTPS یا localhost لازم است.

## migration و داده

`pnpm db:migrate` تغییرات نسخه‌دار را اعمال می‌کند. پیش از migration عملیاتی snapshot و آزمون rollback/restore لازم است. `pnpm db:seed` صرفاً کاتالوگ و حساب‌های ساختگی توسعه را ایجاد می‌کند. اجرای مجدد، درخواست‌ها و پیوست‌ها را حذف نمی‌کند.

تست خودکار، دیتابیس مستقل موقت دارد. PostgreSQL شبکه‌ای، reverse proxy واقعی، پیامک، push، نصب PWA روی Android و APK در این محیط اجرا نشده‌اند؛ این سند گزارش تست استقرار نیست.
