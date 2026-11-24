import { CircleHelp, ClipboardPenLine, FileText, Info, MessageSquareText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router';
import { MenuItem } from '../app/parts';
import { PageHeader } from '../components/ui';

export function MorePage() {
  return <main className="page-enter ref-more">
    <PageHeader title="بیشتر" subtitle=""/>
    <div className="sheet">
      <nav className="menu" aria-label="اطلاعات و راهنما">
        <MenuItem to="/welcome" icon={Info} title="درباره تربتینو"/>
        <MenuItem to="/support" icon={CircleHelp} title="راهنما و سوالات متداول"/>
        <MenuItem to="/catalog/citizen-support" icon={MessageSquareText} title="راه‌های ارتباط و پشتیبانی"/>
        <MenuItem to="/account/support" icon={ClipboardPenLine} title="نظرسنجی و پیشنهادها"/>
        <MenuItem to="/account/privacy" icon={ShieldCheck} title="حریم خصوصی"/>
        <MenuItem to="/terms" icon={FileText} title="شرایط استفاده"/>
      </nav>
      <img className="ref-skyline" src="/torbatino-skyline.svg" alt="" width="400" height="135"/>
    </div>
  </main>;
}

export function TermsPage() {
  return <main className="page-enter">
    <PageHeader title="شرایط استفاده" subtitle=""/>
    <div className="sheet prose">
      <p>تربتینو در مرحلهٔ آزمایشی است و ثبت درخواست به‌معنی ارسال آن به ادارهٔ رسمی نیست.</p>
      <p>برای گزارش‌های فوری از مسیر رسمی امداد و خدمات اضطراری استفاده کنید. در گزارش عمومی، اطلاعات و تصویر اشخاص دیگر را به اشتراک نگذارید.</p>
      <Link className="btn-soft" to="/account/privacy">مشاهده حریم خصوصی</Link>
    </div>
  </main>;
}
