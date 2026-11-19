export function Logo({ imageSrc, size = 40, showText = true, className = '' }: {
    imageSrc?: string;
    size?: number | string;
    showText?: boolean;
    className?: string;
    textColor?: string;
}) { return <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{imageSrc ? <img src={imageSrc} alt="نشان تربت من" width={size} height={size}/> : <span aria-label="جایگاه نشان موقت" style={{ width: size, height: size, display: 'grid', placeItems: 'center', background: '#F5EDF9', borderRadius: 14, color: '#6F248E', fontWeight: 800 }}>ت</span>}{showText && <strong>تربت من</strong>}</div>; }
