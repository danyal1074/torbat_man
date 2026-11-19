ALTER TABLE "idempotency_keys" ADD COLUMN "fingerprint" text;
--> statement-breakpoint
UPDATE services SET status='active_demo',description='راهنمای استفاده، پرسش‌های رایج و ثبت پیام خصوصی برای پشتیبانی یا گزارش مشکل برنامه در نسخه آزمایشی.' WHERE slug='citizen-support' AND description='درباره نسخه و محدودیت‌ها در حساب من موجود است. مرکز پاسخ‌گویی، FAQ، گزارش باگ و متن حقوقی تأییدشده در مرحله بعد تکمیل می‌شود.';
