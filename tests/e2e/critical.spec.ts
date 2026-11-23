import { readFileSync } from 'node:fs';
import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

async function api<T>(request: APIRequestContext, method: string, path: string, data?: unknown): Promise<T> {
  const response = await request.fetch('/v1' + path, { method, data });
  expect(response.ok(), method + ' ' + path + ' → ' + response.status()).toBe(true);
  return response.json();
}

async function login(page: Page, mobile: string, next = '/') {
  await page.goto('/login?next=' + encodeURIComponent(next));
  await page.getByLabel('شماره موبایل').fill(mobile);
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click();
  const code = page.locator('.demo-note bdi');
  await expect(code).toHaveText(/^\d{5}$/);
  await page.getByLabel('کد تأیید', { exact: true }).fill((await code.textContent())!);
  await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
  if (next === '/') {
    await page.waitForURL(url => url.pathname === '/' || url.pathname === '/login/profile');
    if (new URL(page.url()).pathname === '/login/profile') await page.getByRole('link', { name: 'بعداً تکمیل می‌کنم' }).click();
  } else await page.waitForURL(url => url.pathname + url.search === next);
}

async function staff(request: APIRequestContext, mobile: string) {
  const { devCode } = await api<{ devCode: string }>(request, 'POST', '/admin/auth/request-otp', { mobile });
  await api(request, 'POST', '/admin/auth/verify-otp', { mobile, code: devCode });
}

test('ظاهر کلاد، چیدمان راست‌به‌چپ و نمایش خدمات در چهار اندازه', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /به تربتینو خوش آمدید/ })).toBeVisible();
    await expect(page.locator('.hero-home .brand img')).toHaveJSProperty('complete', true);
    expect(await page.locator('html').getAttribute('dir')).toBe('rtl');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'test-results/claude-home-' + width + '.png', animations: 'disabled', fullPage: true });
  }
  await page.goto('/services');
  await expect(page.getByRole('heading', { name: 'همه خدمات', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'خدمات شهری', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'کاتالوگ سامانه و وضعیت ثبت خدمات' }).click();
  await expect(page.getByRole('heading', { name: 'کاتالوگ سامانه' })).toBeVisible();
  await expect(page.getByRole('link', { name: /خرابی آسفالت/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('فرم کلاد گزارش و پیوست واقعی می‌سازد و شهروند پاسخ، وضعیت و اعلان را می‌بیند', async ({ page, browser }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, '09120000001', '/shahrbin/new?type=roads');
  await page.getByLabel('توضیحات مشکل').fill('چاله بزرگ در معبر؛ آزمون ثبت واقعی گزارش در فرانت کلاد.');
  await page.locator('input[type=file]').setInputFiles({ name: 'report.png', mimeType: 'image/png', buffer: readFileSync('tests/fixtures/report.png') });
  await page.getByRole('button', { name: 'مرحله بعد' }).click();
  await page.getByLabel('نشانی یا نشانه').fill('نشانی ساختگی، کوچهٔ آزمایش');
  await page.getByRole('button', { name: 'مرحله بعد' }).click();
  await expect(page.getByRole('heading', { name: 'بررسی و ارسال' })).toBeVisible();
  await page.route('**/v1/requests', route => route.request().method() === 'POST' ? route.abort() : route.continue());
  await page.getByRole('button', { name: 'ثبت گزارش', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.unroute('**/v1/requests');
  await page.getByRole('button', { name: 'ثبت گزارش', exact: true }).click();
  await page.waitForURL(/\/shahrbin\/success\//);
  const id = page.url().split('/').at(-1)!;
  await expect(page.locator('.code-box strong')).toHaveText(/^TM-/);
  await page.getByRole('link', { name: 'مشاهده وضعیت گزارش' }).click();
  await expect(page.getByRole('link', { name: /مشاهده پیوست/ })).toHaveCount(1);
  const context = await browser.newContext();
  try {
    await staff(context.request, '09130000001');
    const base = '/admin/requests/' + id;
    const { id: actor } = await api<{ id: string }>(context.request, 'GET', '/admin/me');
    await api(context.request, 'PATCH', base + '/assign', { assigneeId: actor });
    await api(context.request, 'POST', base + '/comments', { body: 'پاسخ آزمایشی ثبت‌شده توسط کارشناس', visibility: 'public' });
    await api(context.request, 'PATCH', base + '/status', { status: 'in_progress', reason: 'بررسی آغاز شد' });
    await api(context.request, 'PATCH', base + '/status', { status: 'resolved', reason: 'رسیدگی مورد آزمایشی انجام شد' });
    await page.reload();
    await expect(page.getByText('پاسخ آزمایشی ثبت‌شده توسط کارشناس')).toBeVisible();
    await expect(page.locator('.detail-top .sbadge')).toHaveText('انجام‌شده');
    await page.getByRole('radio', { name: '۵ ستاره' }).click();
    await expect(page.getByRole('heading', { name: 'امتیاز شما ثبت شد' })).toBeVisible();
    await page.getByLabel('دلیل درخواست بررسی دوباره').fill('بررسی دوباره در سناریوی آزمایشی لازم است.');
    await page.getByRole('button', { name: 'بازگشایی گزارش', exact: true }).click();
    await expect(page.locator('.timeline [aria-current=step]')).toContainText('بازگشایی شد');
    await page.goto('/notifications');
    await expect(page.getByText(/پاسخ آزمایشی ثبت‌شده توسط کارشناس|وضعیت درخواست شما/).first()).toBeVisible();
    await page.getByRole('button', { name: 'علامت‌گذاری همه به‌عنوان خوانده‌شده' }).click();
    await expect(page.locator('.notice.unread')).toHaveCount(0);
  } finally { await context.close(); }
});

test('کد نادرست پذیرفته نمی‌شود و نشست شهروند ایجاد نمی‌شود', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('شماره موبایل').fill('09121110004');
  await page.getByRole('button', { name: 'دریافت کد تأیید' }).click();
  const code = page.locator('.demo-note bdi');
  await expect(code).toHaveText(/^\d{5}$/);
  const value = (await code.textContent())!;
  await page.getByLabel('کد تأیید', { exact: true }).fill(value === '12345' ? '12346' : '12345');
  await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect((await page.request.get('/v1/me')).status()).toBe(401);
});

test('درخواست اداری از فرم نسخه‌دار سامانه ثبت می‌شود', async ({ page }) => {
  const path = '/catalog/muni-general-request?action=new';
  await login(page, '09121110005', path);
  await page.getByLabel('توضیح درخواست').fill('درخواست اداری آزمایشی برای بررسی شناسایی فرم پویا.');
  await page.getByLabel('نشانی یا محله').fill('نشانی ساختگی نمونه');
  for (const select of await page.locator('main select[required]').all()) {
    const options = await select.locator('option:not([value=""])').evaluateAll(items => items.map(item => (item as HTMLOptionElement).value));
    await select.selectOption(options[0]);
  }
  for (const control of await page.locator('main input[required]:not([type=checkbox]), main textarea[required]').all()) {
    if (!await control.inputValue()) await control.fill('1234567890');
  }
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'ثبت درخواست', exact: true }).click();
  await page.waitForURL(/\/shahrbin\/success\//);
  await expect(page.getByText('درخواست اداری ثبت شد', { exact: true })).toBeVisible();
});

test('پشتیبانی پیام واقعی را در صندوق کارکنان مجاز دریافت می‌کند', async ({ page, browser }) => {
  await login(page, '09121110006', '/account/support');
  const text = 'پیام آزمایشی پشتیبانی از رابط اصلی کلاد';
  await page.getByLabel('موضوع', { exact: true }).selectOption('bug');
  await page.getByLabel('متن پیام', { exact: true }).fill(text);
  await page.getByRole('button', { name: 'ثبت پیام', exact: true }).click();
  await expect(page.getByText('پیام شما ثبت شد.')).toBeVisible();
  const context = await browser.newContext();
  try {
    await staff(context.request, '09100000002');
    const { data } = await api<{ data: { message: string }[] }>(context.request, 'GET', '/admin/feedback');
    expect(data.some(item => item.message === text)).toBe(true);
  } finally { await context.close(); }
});
