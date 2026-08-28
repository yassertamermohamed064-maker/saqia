import { useState } from 'react';
import { MapPin, Navigation, ExternalLink, Loader2 } from 'lucide-react';

interface MapPickerProps {
  lat: number | null;
  lng: number | null;
  defaultLat: number;
  defaultLng: number;
  onChange: (lat: number, lng: number, address?: string) => void;
}

export function MapPicker({ lat, lng, defaultLat, defaultLng, onChange }: MapPickerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const displayLat = lat ?? defaultLat;
  const displayLng = lng ?? defaultLng;

  const embedSrc = `https://maps.google.com/maps?q=${displayLat},${displayLng}&z=14&output=embed&hl=ar`;

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع');
      return;
    }
    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        onChange(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLoading(false);
        if (err.code === 1) setError('تم رفض الإذن بالوصول إلى الموقع. يرجى السماح بالموقع أو إدخال الإحداثيات يدوياً');
        else setError('تعذر تحديد الموقع. حاول مرة أخرى أو أدخل الإحداثيات يدوياً');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const applyManual = () => {
    const la = parseFloat(manualLat);
    const ln = parseFloat(manualLng);
    if (!isNaN(la) && !isNaN(ln)) {
      onChange(la, ln);
      setManualLat('');
      setManualLng('');
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative w-full h-64 rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
        <iframe
          src={embedSrc}
          className="w-full h-full"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="موقع التوصيل"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          تحديد موقعي الحالي
        </button>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${displayLat},${displayLng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
        >
          <ExternalLink className="w-4 h-4" />
          فتح في خرائط جوجل
        </a>
      </div>

      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 rounded-lg p-3">{error}</p>
      )}

      <div className="flex flex-wrap items-end gap-2 pt-1">
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">خط العرض</label>
          <input
            type="text"
            inputMode="decimal"
            value={manualLat}
            onChange={(e) => setManualLat(e.target.value)}
            placeholder={displayLat.toFixed(4)}
            className="input-field !py-2 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="block text-xs font-medium text-slate-500 mb-1">خط الطول</label>
          <input
            type="text"
            inputMode="decimal"
            value={manualLng}
            onChange={(e) => setManualLng(e.target.value)}
            placeholder={displayLng.toFixed(4)}
            className="input-field !py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={applyManual}
          className="btn-secondary !py-2 !px-4 text-sm"
        >
          تطبيق
        </button>
      </div>

      {lat != null && lng != null && (
        <div className="flex items-start gap-2 text-sm text-slate-600 bg-blue-50 rounded-lg p-3">
          <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
          <span className="font-mono text-xs">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </span>
        </div>
      )}
    </div>
  );
}
