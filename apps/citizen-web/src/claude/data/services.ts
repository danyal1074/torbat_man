import type { LucideIcon } from 'lucide-react';
import {
  Megaphone, Trees, Lightbulb, Route, Trash2, ShoppingBag, Wheat, Bus, HeartPulse,
  ShoppingCart, Store, Wrench, Briefcase, Package, Flower2, Sprout, MapPinned,
  GraduationCap, Users, BookOpen, Dumbbell, BarChart3, Database, Search, Bot,
  Building2, Home, Sparkles, Landmark
} from 'lucide-react';

/** live = has a real route today; soon = honest "coming soon" page. No fake services. */
export type ServiceStatus = 'live' | 'soon';
export interface Service { id: string; title: string; icon: LucideIcon; status: ServiceStatus; provider: string; path: string }
export interface Category {
  id: string; title: string; description: string; icon: LucideIcon; tone: 'lilac' | 'cream'; services: Service[];
}
const s = (id: string, title: string, icon: LucideIcon, provider: string, status: ServiceStatus = 'live'): Service =>
  ({ id, title, icon, provider, status, path: `/services/${id}` });

export const categories: Category[] = [
  { id: 'city', title: 'خدمات شهری', description: 'گزارش‌ها، امور شهری و خدمات زیرساختی', icon: Building2, tone: 'lilac', services: [
    s('energy', 'انرژی من و انرژی‌یار', Sprout, 'تربتینو'),
    s('nobatino', 'نوبتینو و رزرو نوبت', Users, 'تربتینو'),
    s('shahrbin', 'شهربین', Megaphone, 'شهرداری تربت حیدریه', 'live'),
    s('green-space', 'فضای سبز', Trees, 'شهرداری تربت حیدریه'),
    s('lighting', 'روشنایی', Lightbulb, 'شهرداری تربت حیدریه'),
    s('roads', 'معابر و آسفالت', Route, 'شهرداری تربت حیدریه'),
    s('waste', 'نظافت و پسماند', Trash2, 'شهرداری تربت حیدریه'),
  ]},
  { id: 'daily', title: 'زندگی روزمره', description: 'خدمات اضطراری و روزمره شهروندان', icon: Home, tone: 'cream', services: [
    s('shop', 'خرید من', ShoppingBag, 'فروشگاه‌ها'),
    s('bread', 'نان من', Wheat, 'نانوایی‌ها'),
    s('bus', 'اتوبوس من', Bus, 'سازمان حمل‌ونقل'),
    s('health', 'سلامت من', HeartPulse, 'مراکز درمانی'),
  ]},
  { id: 'economy', title: 'اصناف و اقتصاد', description: 'کسب‌وکارها، مشاغل و فرصت‌های شغلی', icon: Store, tone: 'lilac', services: [
    s('bazaar', 'بازار تربت', ShoppingCart, 'اتاق اصناف'),
    s('guilds', 'اصناف من', Store, 'اتاق اصناف'),
    s('craftsman', 'استادکار من', Wrench, 'اتاق اصناف'),
    s('jobs', 'تربت کار', Briefcase, 'اداره کار'),
  ]},
  { id: 'county', title: 'خدمات شهرستان', description: 'مختص توانمندی‌ها و هویت محلی تربت', icon: Flower2, tone: 'cream', services: [
    s('local-products', 'محصولات محلی', Package, 'جهاد کشاورزی'),
    s('saffron', 'زعفران من', Flower2, 'جهاد کشاورزی'),
    s('farmer', 'کشاورز من', Sprout, 'جهاد کشاورزی'),
    s('tourism', 'تربت‌گرد', MapPinned, 'میراث فرهنگی و گردشگری'),
  ]},
  { id: 'family', title: 'خانواده و آموزش', description: 'خدمات خانواده، آموزش و سبک زندگی', icon: GraduationCap, tone: 'lilac', services: [
    s('students', 'دانش‌آموزی', GraduationCap, 'آموزش و پرورش'),
    s('my-family', 'خانواده من', Users, 'بهزیستی'),
    s('education', 'آموزش من', BookOpen, 'آموزش و پرورش'),
    s('sports', 'ورزش و تفریح', Dumbbell, 'اداره ورزش و جوانان'),
  ]},
  { id: 'smart', title: 'هوشمندسازی', description: 'خدمات نوین و هوشمند شهری', icon: Sparkles, tone: 'cream', services: [
    s('analytics', 'تحلیل و آمار', BarChart3, 'مرکز داده شهری'),
    s('digital', 'خدمات دیجیتال', Database, 'مرکز داده شهری'),
    s('smart-search', 'جست‌وجوی هوشمند', Search, 'مرکز داده شهری'),
    s('assistant', 'دستیار هوشمند', Bot, 'مرکز داده شهری'),
  ]},
];
export const allServices = categories.flatMap((c) => c.services.map((x) => ({ ...x, category: c })));
export const fallbackIcon = Landmark;
