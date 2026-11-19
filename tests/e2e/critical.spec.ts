import { test, expect, type Page } from '@playwright/test';
async function login(page: Page, mobile: string, admin = false) {
    await page.goto(admin ? '/admin/login' : '/login');
    await page.getByLabel('شماره همراه', { exact: true }).fill(mobile);
    await page.getByRole('button', { name: 'دریافت کد ورود', exact: true }).click();
    const banner = page.locator('.notice');
    await expect(banner).toContainText('کد آزمایشی');
    const code = (await banner.innerText()).match(/\d{5}/)![0];
    await page.getByLabel('کد ورود', { exact: true }).fill(code);
    await page.getByRole('button', { name: 'تأیید و ورود', exact: true }).click();
    await expect(page).toHaveURL(admin ? /\/admin$/ : /\/$/);
}
test('شهروند ← ثبت تصویر و درخواست ← کارشناس ← پاسخ و اعلان ← بازگشایی', async ({ page, browser }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, '09120000001');
    await page.getByRole('link', { name: /مشکلی در شهر دارم/ }).click();
    await page.getByLabel('چه اتفاقی افتاده یا چه درخواستی داری؟').fill('آسفالت کوچه خراب است و چاله بزرگی در مسیر رفت‌وآمد ایجاد شده است.');
    await page.getByLabel('خدمت و سازمان پاسخ‌گو').selectOption('report-road');
    await page.getByRole('button', { name: 'ادامه', exact: true }).click();
    await page.getByLabel('نشانی یا محله').fill('نشانی ساختگی آزمایشی، کوچه تست');
    await page.getByLabel(/تصویر \(اختیاری/).setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVwAAAABJRU5ErkJggg==', 'base64') });
    await page.getByRole('button', { name: 'ادامه', exact: true }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'تأیید و ثبت درخواست', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'درخواستت ثبت شد' })).toBeVisible();
    await page.getByRole('link', { name: 'مشاهده و پیگیری درخواست' }).click();
    await expect(page.getByRole('heading', { name: 'مسیر درخواست' })).toBeVisible();
    const requestId = page.url().split('/').at(-1)!;
    await expect(page.getByAltText('پیوست خصوصی درخواست')).toBeVisible();
    const staffContext = await browser.newContext();
    const staff = await staffContext.newPage();
    await login(staff, '09130000001', true);
    await staff.goto('/admin/requests/' + requestId);
    await expect(staff.getByText('نشانی ساختگی آزمایشی، کوچه تست', { exact: true })).toBeVisible();
    await staff.getByRole('button',{name:'ارجاع به خودم',exact:true}).click();
    await expect(staff.locator('.notice')).toContainText('تغییرات ذخیره شد');
    await staff.getByLabel('تصویر نتیجه رسیدگی').setInputFiles({name:'result.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVwAAAABJRU5ErkJggg==','base64')});
    await staff.getByRole('button',{name:'بارگذاری تصویر نتیجه',exact:true}).click();
    await expect(staff.getByText('تصویر نتیجه ذخیره شد.',{exact:true})).toBeVisible();
    await staff.getByLabel('پیام جدید').fill('پاسخ آزمایشی کارشناس برای شهروند');
    await staff.getByRole('button', { name: 'ارسال پیام', exact: true }).click();
    await expect(staff.locator('.comment')).toContainText('پاسخ آزمایشی کارشناس');
    await staff.getByLabel('وضعیت بعدی').selectOption('in_progress');
    await staff.getByLabel('دلیل و توضیح رسیدگی').fill('بررسی آزمایشی آغاز شد.');
    await staff.getByRole('button', { name: 'ثبت تغییر وضعیت', exact: true }).click();
    await expect(staff.locator('.spread .chip')).toHaveText('در دست اقدام');
    await staff.getByLabel('وضعیت بعدی').selectOption('resolved');
    await staff.getByLabel('دلیل و توضیح رسیدگی').fill('رفع مشکل به صورت آزمایشی ثبت شد.');
    await staff.getByRole('button', { name: 'ثبت تغییر وضعیت', exact: true }).click();
    await expect(staff.locator('.spread .chip')).toHaveText('رسیدگی شد');
    await page.reload();
    await expect(page.getByAltText('پیوست خصوصی درخواست')).toHaveCount(2);
    await expect(page.locator('.spread .chip')).toHaveText('رسیدگی شد');
    await expect(page.locator('.comment')).toContainText('پاسخ آزمایشی کارشناس');
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: /وضعیت درخواست شما تغییر کرد: حل‌شده/ })).toBeVisible();
    await page.goto('/requests/' + requestId);
    await page.getByLabel('اگر مشکل حل نشده، دلیل بازگشایی را بنویس').fill('مشکل در بررسی آزمایشی هنوز باقی است.');
    await page.getByRole('button', { name: 'بازگشایی درخواست', exact: true }).click();
    await expect(page.locator('.spread .chip')).toHaveText('بازگشایی شد');
    await page.screenshot({ path: 'test-results/request-mobile.png', fullPage: true });
    await staffContext.close();
});
test('صفحه خانه، کاتالوگ، RTL و عرض‌های ۳۲۰ تا ۱۴۴۰', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/');
        await expect(page.getByRole('heading', { name: 'خدمات پرکاربرد' })).toBeVisible();
        await expect(page.locator('.service-tile').first()).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect(await page.locator('html').getAttribute('dir')).toBe('rtl');
        await page.screenshot({ path: `test-results/home-${width}.png`, fullPage: true });
    }
    await page.goto('/services');
    await expect(page.locator('summary').filter({ hasText: 'پرداخت‌ها و قبوض' })).toBeVisible();
    await page.getByRole('textbox', { name: 'جست‌وجوی خدمت', exact: true }).fill('پرداخت قبض');
    await page.getByRole('link', { name: /پرداخت قبض/ }).click();
    await expect(page.getByText(/ثبت مستقیم این خدمت هنوز فعال نیست/)).toBeVisible();
    expect(errors).toEqual([]);
});
test('پیش‌نویس با بازخوانی و خطای شبکه حفظ می‌شود', async ({ page, context }) => {
    await login(page, '09120000002');
    await page.goto('/new');
    const text = 'این متن آزمایشی پیش‌نویس نباید از دست برود.';
    await page.getByLabel('چه اتفاقی افتاده یا چه درخواستی داری؟').fill(text);
    await page.reload();
    await expect(page.getByLabel('چه اتفاقی افتاده یا چه درخواستی داری؟')).toHaveValue(text);
    await context.setOffline(true);
    await page.getByRole('button', { name: 'پیشنهاد دسته آزمایشی' }).click();
    await expect(page.locator('.notice')).toContainText('انتخاب دستی همیشه ممکن است');
    await expect(page.getByLabel('چه اتفاقی افتاده یا چه درخواستی داری؟')).toHaveValue(text);
    await context.setOffline(false);
});
test('میز خدمت آبفا، جداسازی سازمان و انتقال با تاریخچه', async ({ page, browser }) => {
    await login(page, '09121110003');
    await page.goto('/services/abfa-subscriber');
    await page.getByRole('link', { name: /شروع ثبت درخواست/ }).click();
    await page.getByLabel('چه اتفاقی افتاده یا چه درخواستی داری؟').fill('درخواست آزمایشی بررسی خدمات مشترکین آب و فاضلاب');
    await page.getByRole('button', { name: 'ادامه', exact: true }).click();
    await page.getByLabel('نشانی یا محله').fill('نشانی آزمایشی مشترک آبفا');
    const selects = page.locator('main select');
    for (const select of await selects.all()) {
        const values = await select.locator('option').evaluateAll(options => options.map(o => (o as HTMLOptionElement).value).filter(Boolean));
        await select.selectOption(values[0]);
    }
    // Fill other mandatory dynamic inputs without depending on labels of a specific form version.
    for (const input of await page.locator('main input[required]').all()) {
        if (!(await input.inputValue()))
            await input.fill('1234567890');
    }
    await page.getByRole('button', { name: 'ادامه', exact: true }).click();
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'تأیید و ثبت درخواست', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'درخواستت ثبت شد' })).toBeVisible();
    await page.getByRole('link', { name: 'مشاهده و پیگیری درخواست' }).click();
    await expect(page.getByRole('heading', { name: 'مسیر درخواست' })).toBeVisible();
    const id = page.url().split('/').at(-1)!;
    const waterContext = await browser.newContext();
    const water = await waterContext.newPage();
    await login(water, '09140000001', true);
    await water.goto('/admin/requests/' + id);
    await expect(water.getByRole('heading', { name: 'مسیر درخواست' })).toBeVisible();
    const electricityContext = await browser.newContext();
    const electricity = await electricityContext.newPage();
    await login(electricity, '09150000001', true);
    await electricity.goto('/admin/requests/' + id);
    await expect(electricity.getByRole('alert')).toContainText('مجوز دسترسی');
    const options = await water.getByLabel('انتقال به سازمان دیگر').locator('option').evaluateAll(options => options.map(o => ({ value: (o as HTMLOptionElement).value, label: o.textContent })));
    await water.getByLabel('انتقال به سازمان دیگر').selectOption(options.find(o => o.label?.includes('توزیع برق'))!.value);
    await water.getByLabel('دلیل انتقال').fill('انتقال آزمایشی جهت بررسی مسئولیت سازمانی');
    await water.getByRole('button', { name: 'ثبت انتقال سازمانی' }).click();
    await electricity.reload();
    await expect(electricity.getByRole('heading', { name: 'مسیر درخواست' })).toBeVisible();
    await page.reload();
    await expect(page.locator('.timeline')).toContainText('توزیع برق');
    await waterContext.close();
    await electricityContext.close();
});
