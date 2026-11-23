import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ClipboardList } from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import type { ServiceDTO } from '@torbat/contracts';
import { EmptyState, PageHeader, SearchField } from '../components/ui';
import { Field } from '../shahrbin/parts';
import { useUser } from '../state/session';
import { api, json, messageOf } from '../lib/backend';
import { normalizeFa } from '../lib/normalize';

const canSubmit = (service: ServiceDTO) => service.status.startsWith('active')
  && ['admin_request', 'city_report'].includes(service.workflow);
const statusText: Record<ServiceDTO['status'], string> = {
  active_demo: 'آزمایشی', active_integrated: 'متصل', informational: 'راهنما',
  coming_soon: 'به‌زودی', disabled: 'غیرفعال',
};

export function CityAnnouncements() {
  const news = useQuery({
    queryKey: ['city-announcements'],
    queryFn: ({ signal }) => api<{ data: { id: string; title: string; body: string; isDemo: boolean }[] }>('/announcements', { signal }),
  });
  return <main className="page-enter"><PageHeader title="اطلاعیه‌های شهر" subtitle="خبرهای تربت حیدریه"/>
    <div className="sheet">
      {news.isPending ? <p role="status">در حال دریافت اطلاعیه‌ها…</p>
        : news.isError ? <p className="field-err" role="alert">{messageOf(news.error)}</p>
        : !news.data.data.length ? <EmptyState title="اطلاعیه‌ای منتشر نشده است" text="اطلاعیه‌های منتشرشده در این صفحه دیده می‌شوند."/>
        : <div className="faq">{news.data.data.map(item => <details key={item.id}>
          <summary>{item.title}{item.isDemo && <small className="badge"> آزمایشی</small>}</summary>
          <p>{item.body}</p>
        </details>)}</div>}
    </div>
  </main>;
}

export function LiveCatalog({ office = false }: { office?: boolean }) {
  const [q, setQ] = useState('');
  const query = useQuery({
    queryKey: ['catalog'],
    queryFn: ({ signal }) => api<{ data: ServiceDTO[] }>('/services', { signal }),
  });
  const needle = normalizeFa(q);
  const services = query.data?.data.filter(service =>
    (!office || service.workflow === 'admin_request')
    && normalizeFa([service.title, service.shortTitle, ...service.keywords].join(' ')).includes(needle)
  ) ?? [];

  return <main className="page-enter">
    <PageHeader title={office ? 'خدمات دیجیتال' : 'کاتالوگ سامانه'} subtitle={office ? 'درخواست‌های اداری' : 'وضعیت و جزئیات خدمات'}/>
    <div className="sheet">
      <SearchField value={q} onChange={setQ}/>
      {query.isPending ? <p role="status">در حال دریافت خدمات…</p>
        : query.isError ? <p className="field-err" role="alert">{messageOf(query.error)}</p>
        : services.length === 0 ? <EmptyState title="خدمتی پیدا نشد" text="عبارت دیگری را امتحان کنید."/>
        : <ul className="rlist">{services.map(service => <li key={service.id}>
          <Link className="rrow" to={'/catalog/' + service.slug}>
            <span className="rico"><ClipboardList size={23}/></span>
            <span className="rtxt"><strong>{service.title}</strong><small>{service.organization?.name ?? statusText[service.status]}</small></span>
            <ChevronLeft size={17}/>
          </Link>
        </li>)}</ul>}
    </div>
  </main>;
}

export function LiveService() {
  const { slug = '' } = useParams();
  const [params] = useSearchParams();
  const query = useQuery({
    queryKey: ['service', slug],
    queryFn: ({ signal }) => api<{ data: ServiceDTO }>('/services/' + encodeURIComponent(slug), { signal }),
  });
  const service = query.data?.data;
  return <main className="page-enter">
    <PageHeader title={service?.title ?? 'جزئیات خدمت'} subtitle={service?.organization?.name ?? 'کاتالوگ سامانه'}/>
    <div className="sheet">
      {!service ? query.isPending ? <p role="status">در حال دریافت خدمت…</p>
        : <p className="field-err" role="alert">{messageOf(query.error)}</p>
        : params.get('action') === 'new' && canSubmit(service) ? <ServiceForm key={service.id} service={service}/>
        : <>
          <span className="badge">{statusText[service.status]}</span>
          <p>{service.description}</p>
          {service.integrationNote && <p className="demo-note">{service.integrationNote}</p>}
          {service.requirements.length > 0 && <><h2 className="sec-title sm">مدارک و اطلاعات لازم</h2><ul className="prose">{service.requirements.map(item => <li key={item}>{item}</li>)}</ul></>}
          {service.steps.length > 0 && <><h2 className="sec-title sm">مراحل</h2><ol className="prose">{service.steps.map(item => <li key={item}>{item}</li>)}</ol></>}
          {canSubmit(service) ? <Link className="btn-main" to={'?action=new'}>شروع ثبت درخواست</Link> : <p className="demo-note">ثبت مستقیم این خدمت هنوز فعال نیست.</p>}
        </>}
    </div>
  </main>;
}

function ServiceForm({ service }: { service: ServiceDTO }) {
  const user = useUser();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState('');
  const path = '/catalog/' + service.slug + '?action=new';
  if (!user) return <Link className="btn-main" to={'/login?next=' + encodeURIComponent(path)}>ورود و ادامه</Link>;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    const idempotencyKey = key || crypto.randomUUID();
    setKey(idempotencyKey);
    try {
      const result = await api<{ data: { id: string } }>('/requests', {
        ...json({ serviceSlug: service.slug, description, addressText: address || undefined, formData: fields }),
        headers: { 'Idempotency-Key': idempotencyKey },
      });
      await client.invalidateQueries({ queryKey: ['claude-requests'] });
      navigate('/shahrbin/success/' + result.data.id, { replace: true });
    } catch (error) { setError(messageOf(error)); } finally { setBusy(false); }
  };
  return <form className="stack" onSubmit={submit} onChange={() => setKey('')}>
    <Field id="service-description" label="توضیح درخواست"><textarea id="service-description" className="input area" required minLength={10} maxLength={2000} value={description} onChange={e => setDescription(e.target.value)}/></Field>
    <Field id="service-address" label="نشانی یا محله"><input id="service-address" className="input" required={service.workflow === 'city_report'} maxLength={300} value={address} onChange={e => setAddress(e.target.value)}/></Field>
    {service.form?.fields.map(field => {
      const attributes = {
        id: 'service-field-' + field.name, className: 'input', required: field.required,
        value: fields[field.name] ?? '',
        onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
          setFields(current => ({ ...current, [field.name]: event.target.value })),
      };
      return <Field key={field.name} id={attributes.id} label={field.label} hint={field.helper}>
        {field.type === 'select' || field.type === 'radio' ? <select {...attributes}>
          <option value="">انتخاب کنید</option>
          {field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select> : field.type === 'textarea' ? <textarea {...attributes} minLength={field.minLength} maxLength={field.maxLength}/>
          : <input {...attributes} minLength={field.minLength} maxLength={field.maxLength}
              inputMode={field.type === 'number' ? 'decimal' : field.type === 'tel' ? 'tel' : undefined}/>}
      </Field>;
    })}
    {service.status === 'active_demo' && <label><input type="checkbox" required/> ثبت درخواست در محیط آزمایشی را تأیید می‌کنم.</label>}
    {error && <p className="field-err" role="alert">{error}</p>}
    <button className="btn-main" disabled={busy}>{busy ? 'در حال ثبت…' : 'ثبت درخواست'}</button>
  </form>;
}
