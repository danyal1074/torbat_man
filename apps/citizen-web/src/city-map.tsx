import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Map as MapIcon, MapPin, Megaphone } from 'lucide-react';
import { Link } from 'react-router';
import { Page } from './lib';
import 'leaflet/dist/leaflet.css';

const center: [number, number] = [35.2741, 59.2195];
export const cityMapUrl = 'https://www.openstreetmap.org/#map=14/35.2741/59.2195';

export function MapPreview() {
  return <Link className="city-map-preview" to="/city-map" aria-label="رفتن به نقشه تربت حیدریه">
    <span className="map-preview-marker"><MapPin size={24}/></span>
    <span className="map-preview-label">پیش‌نمایش شماتیک</span>
  </Link>;
}

export function CityMap() {
  const container = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(false);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    if (!opened) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    void import('leaflet').then(leaflet => {
      if (cancelled || !container.current) return;
      const map = leaflet.map(container.current, { scrollWheelZoom: false }).setView(center, 14);
      cleanup = () => map.remove();
      map.attributionControl.setPrefix(false);
      const tiles = leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      });
      timer = setTimeout(() => setState('error'), 12000);
      tiles.once('tileload', () => {
        clearTimeout(timer);
        setState('ready');
      });
      tiles.addTo(map);
      leaflet.circleMarker(center, {
        radius: 9, color: '#fff', weight: 3, fillColor: '#76228c', fillOpacity: 1,
      }).addTo(map).bindTooltip('تربت حیدریه');
    }).catch(() => {
      if (!cancelled) setState('error');
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      cleanup?.();
    };
  }, [opened]);

  return <Page title="نقشه شهر">
    <section className="civic-surface civic-map-page">
      {opened ? <>
        <div className="interactive-city-map" ref={container} aria-label="نقشه تعاملی تربت حیدریه"/>
        {state !== 'ready' && <p role="status">{state === 'loading' ? 'در حال دریافت نقشه…' : 'نقشه در دسترس نیست. می‌توانید آن را در OpenStreetMap باز کنید.'}</p>}
      </> : <button type="button" className="city-map-preview" onClick={() => setOpened(true)}>
        <span className="map-preview-marker"><MapPin size={24}/></span>
        <span className="map-preview-action">نمایش نقشه تعاملی</span>
      </button>}
      <div className="civic-map-actions">
        <a className="button outline" href={cityMapUrl} target="_blank" rel="noreferrer"><MapIcon size={19}/> OpenStreetMap <ChevronLeft size={17}/></a>
        <Link className="button outline" to="/services/service-centers">خدمات شهری</Link>
        <Link className="button" to="/new?kind=city_report"><Megaphone size={19}/> گزارش جدید</Link>
      </div>
    </section>
  </Page>;
}
