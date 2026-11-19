import type { FastifyInstance } from 'fastify';
import { route } from '../lib/route';
export interface PlaceDTO {
    id: string;
    title: string;
    category: 'landmark' | 'administrative' | 'service';
    lat: number;
    lng: number;
    address: string;
    description?: string;
    imageUrl?: string;
}
export const TORBAT_PLACES: PlaceDTO[] = [
    {
        id: 'plc-qotb',
        title: 'مزار قطب‌الدین حیدر',
        category: 'landmark',
        lat: 35.2755,
        lng: 59.2198,
        address: 'تربت حیدریه، انتهای خیابان فرمانداری، محله قطب‌الدین حیدر',
        description: 'آرامگاه عارف نامدار قرن ششم هجری با گنبد و مقرنس‌های آجری و ایوان تاریخی ایلخانی و صفوی.',
    },
    {
        id: 'plc-robat-tabasi',
        title: 'رباط طبسی',
        category: 'landmark',
        lat: 35.2758,
        lng: 59.2202,
        address: 'تربت حیدریه، مجاور مزار قطب‌الدین حیدر',
        description: 'کاروانسرای تاریخی دوره قاجار شامل موزه مردم‌شناسی و کارگاه‌های صنایع دستی.',
    },
    {
        id: 'plc-muni',
        title: 'شهرداری مرکزی تربت حیدریه',
        category: 'administrative',
        lat: 35.2740,
        lng: 59.2185,
        address: 'تربت حیدریه، میدان شهدا، بلوار امام رضا',
        description: 'ساختمان اداری مرکزی شهرداری تربت حیدریه.',
    },
    {
        id: 'plc-abfa',
        title: 'اداره آب و فاضلاب تربت حیدریه',
        category: 'administrative',
        lat: 35.2790,
        lng: 59.2250,
        address: 'تربت حیدریه، بلوار مدرس',
        description: 'امور مشترکین و خدمات آب و فاضلاب.',
    },
    {
        id: 'plc-bargh',
        title: 'مدیریت توزیع برق تربت حیدریه',
        category: 'administrative',
        lat: 35.2710,
        lng: 59.2150,
        address: 'تربت حیدریه، میدان فردوسی',
        description: 'امور اتفاقات و خدمات مشترکین برق.',
    },
];
export function placesRoutes(app: FastifyInstance) {
    route(app, {
        method: 'GET',
        url: '/v1/map/places',
        summary: 'نقاط مهم و راهنمای مکانی شهر تربت حیدریه',
        tags: ['map'],
        auth: 'none',
        handler: async () => {
            return { data: TORBAT_PLACES };
        },
    });
}
