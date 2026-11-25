import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function BookingQr({ url }: { url: string }) {
  const [image, setImage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setError('');
    setImage('');
    void QRCode.toDataURL(url, { width: 480, margin: 3, errorCorrectionLevel: 'M' })
      .then(result => { if (active) setImage(result); })
      .catch(() => { if (active) setError('ساخت QR انجام نشد. از لینک عمومی استفاده کنید.'); });
    return () => { active = false; };
  }, [url]);
  return <div className="nb-qr">
    {image && <><img src={image} width={200} height={200} alt="QR لینک عمومی رزرو همین مرکز" /><a href={image} download="nobatino-booking-qr.png">دریافت QR برای چاپ</a></>}
    {error && <p role="alert">{error}</p>}
    <p className="nb-note">این کد فقط نشانی عمومی مرکز را دارد.</p>
  </div>;
}
