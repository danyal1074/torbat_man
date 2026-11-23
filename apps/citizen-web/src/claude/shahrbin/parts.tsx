import { map as createMap, tileLayer, circleMarker, layerGroup, type Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Check, Crosshair } from 'lucide-react';
import { GeoPoint, ProblemType, ReportStatus, CITY_CENTER, statusMeta, faDigits } from './model';

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="stepper" aria-label="مراحل ثبت گزارش">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li key={s} className={`step ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="dot">{state === 'done' ? <Check size={16} aria-hidden="true" /> : faDigits(i + 1)}</span>
            <span className="step-lbl">{s}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function TypeTile({ type, selected, onSelect }: { type: ProblemType; selected: boolean; onSelect: () => void }) {
  const Icon = type.icon;
  return (
    <button type="button" className={`tile${selected ? ' selected' : ''}`} aria-pressed={selected} onClick={onSelect}>
      {selected && <span className="tile-check"><Check size={14} aria-hidden="true" /></span>}
      <Icon size={30} strokeWidth={1.7} aria-hidden="true" /><span>{type.title}</span>
    </button>
  );
}

export function StatusBadge({ status }: { status: ReportStatus }) {
  const m = statusMeta[status];
  return <span className={`sbadge ${m.tone}`}>{m.label}</span>;
}

type MapMarker = { id: string; point: GeoPoint; title: string };
export function MapPicker({ point, onChange, readOnly, onLocate, label = 'نقشه تربت حیدریه', markers = [], onSelect }: {
  point: GeoPoint | null; onChange?: (p: GeoPoint) => void; readOnly?: boolean; onLocate?: () => void; label?: string;
  markers?: MapMarker[]; onSelect?: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const callbacks = useRef({ onChange, onSelect });
  const [loaded, setLoaded] = useState(false);
  const [tileError, setTileError] = useState(false);
  useEffect(() => { callbacks.current = { onChange, onSelect }; }, [onChange, onSelect]);

  useEffect(() => {
    if (!ref.current) return;
    const map = createMap(ref.current, { scrollWheelZoom: false })
      .setView([CITY_CENTER.lat, CITY_CENTER.lon], 14);
    mapRef.current = map;
    map.attributionControl.setPrefix(false);
    tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).on('tileloaderror', () => setTileError(true)).on('tileload', () => setTileError(false)).addTo(map);
    map.on('click', event => {
      if (!readOnly) callbacks.current.onChange?.({ lat: event.latlng.lat, lon: event.latlng.lng });
    });
    setLoaded(true);
    return () => { map.remove(); mapRef.current = null; };
  }, [readOnly]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || !point) return;
    const coordinates: [number, number] = [point.lat, point.lon];
    if (!map.getBounds().contains(coordinates)) map.setView(coordinates, map.getZoom(), { animate: false });
    const pin = circleMarker(coordinates, { radius: 9, color: '#fff', weight: 3, fillColor: '#7541a5', fillOpacity: 1 }).addTo(map);
    return () => { pin.remove(); };
  }, [loaded, point]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    const pins = layerGroup().addTo(map);
    for (const item of markers) {
      const label = document.createElement('span');
      label.textContent = item.title;
      circleMarker([item.point.lat, item.point.lon], {
        radius: 9, color: '#fff', weight: 3, fillColor: '#7541a5', fillOpacity: 1,
      }).bindTooltip(label).on('click', () => callbacks.current.onSelect?.(item.id)).addTo(pins);
    }
    return () => { pins.remove(); };
  }, [loaded, markers]);

  return <div className="map" dir="ltr">
    <div ref={ref} className="map-surface tn-leaflet" role="region" aria-label={label}/>
    {tileError && <p className="map-load-status" role="status" dir="rtl">بخشی از نقشه در دسترس نیست. نشانی را دستی وارد کنید.</p>}
    {onLocate && !readOnly && <button type="button" className="locate tn-map-locate" onClick={onLocate} aria-label="استفاده از موقعیت فعلی من"><Crosshair size={22} aria-hidden="true"/></button>}
    {!point && !readOnly && <span className="map-hint" dir="rtl">برای انتخاب موقعیت، روی نقشه بزنید</span>}
  </div>;
}

export function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id} className="field-label">{label}</label>
      {children}
      {error ? <p id={`${id}-err`} className="field-err" role="alert">{error}</p> : hint ? <p id={`${id}-hint`} className="field-hint">{hint}</p> : null}
    </div>
  );
}
