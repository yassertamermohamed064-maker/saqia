import { useState } from 'react';
import { Droplets, ArrowRight, User, Phone, Lock, Loader as Loader2, CircleAlert as AlertCircle, Eye, EyeOff, LogIn, UserPlus, MapPin, Building, Navigation, Compass, Check, X, CircleHelp as HelpCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { MapPicker } from '@/components/MapPicker';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/lib/auth';
import { useAdminAuth } from '@/lib/adminAuth';
import type { Route } from '@/lib/router';

interface AuthPageProps {
  navigate: (r: Route) => void;
  initialTab?: 'customer' | 'admin';
}

export function AuthPage({ navigate }: AuthPageProps) {
  const { settings, loading: settingsLoading } = useSettings();
  const { loginCustomer, signupCustomer } = useAuth();
  const { loginAdmin } = useAdminAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Customer signup extra fields - إدخال رقم الهاتف بشكل حر ومباشر
  const [name, setName] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  const [manualAddress, setManualAddress] = useState('شارع الملك فهد، حي الملز، الرياض، السعودية');
  const [buildingDetails, setBuildingDetails] = useState('');
  const [lat, setLat] = useState<number | null>(24.7136);
  const [lng, setLng] = useState<number | null>(46.6753);
  const [, setAddress] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  // حالة فتح نافذة الخريطة التفاعلية الكبيرة (Modal)
  const [showMapModal, setShowMapModal] = useState(false);
  const [tempLat, setTempLat] = useState<number>(24.7136);
  const [tempLng, setTempLng] = useState<number>(46.6753);

  if (settingsLoading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Droplets className="w-12 h-12 text-blue-400 animate-bounce" />
      </div>
    );
  }

  const inputIsEmail = identifier.includes('@');

  const fetchAddressFromCoords = async (latitude: number, longitude: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=ar`);
      const data = await res.json();
      if (data && data.display_name) {
        setManualAddress(data.display_name);
        setAddress(data.display_name);
      }
    } catch {
      setManualAddress('شارع الملك فهد، حي الملز، الرياض، السعودية');
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('متصفحك لا يدعم تحديد الموقع الجغرافي');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setLat(latitude);
        setLng(longitude);
        setLocating(false);
        setError(null);
        await fetchAddressFromCoords(latitude, longitude);
      },
      () => {
        setLocating(false);
        setError('تعذّر تحديد موقعك تلقائياً. يرجى اختيار الموقع يدوياً على الخريطة.');
      },
      { enableHighAccuracy: true }
    );
  };

  const openManualMapModal = () => {
    setError(null);
    setTempLat(lat || 24.7136);
    setTempLng(lng || 46.6753);
    setShowMapModal(true);
  };

  const confirmMapSelection = async () => {
    setLat(tempLat);
    setLng(tempLng);
    setShowMapModal(false);
    await fetchAddressFromCoords(tempLat, tempLng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const fullPhone = mode === 'signup' ? phoneInput.trim() : identifier.trim();

    if (!fullPhone) {
      setError('الرجاء إدخال رقم الجوال أو البريد الإلكتروني');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    if (inputIsEmail && mode === 'login') {
      setSubmitting(true);
      const { error: err } = await loginAdmin(identifier.trim(), password);
      setSubmitting(false);
      if (err) { setError(err); return; }
      navigate({ name: 'dashboard' });
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      setError('الرجاء إدخال الاسم الكامل');
      return;
    }

    setSubmitting(true);

    if (mode === 'login') {
      const { error: err } = await loginCustomer(identifier.trim(), password);
      setSubmitting(false);
      if (err) { setError(err); return; }
      navigate({ name: 'order' });
    } else {
      const fullAddressParts = [
        manualAddress.trim(),
        buildingDetails ? `تفاصيل المبنى: ${buildingDetails}` : '',
      ].filter(Boolean);

      const finalAddress = fullAddressParts.join(' - ');

      const { error: err } = await signupCustomer(
        name.trim(),
        phoneInput.trim(),
        password,
        lat,
        lng,
        finalAddress || null
      );
      setSubmitting(false);
      if (err) { setError(err); return; }
      navigate({ name: 'order' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 flex flex-col justify-between" dir="rtl">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/10 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate({ name: 'home' })}
            className="flex items-center gap-2 text-blue-100 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowRight className="w-5 h-5" />
            <span className="text-sm font-semibold">الرئيسية</span>
          </button>
          <Logo logoUrl={settings.logo_url} businessName={settings.business_name} size="sm" />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-md w-full mx-auto px-4 sm:px-6 py-10 my-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-xl shadow-blue-900/50 mb-3">
            <Droplets className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
          </h1>
          <p className="text-blue-200 text-sm">
            {mode === 'login' ? 'ادخل رقم الجوال أو البريد للإدارة' : 'سجل بياناتك وحدد موقعك بكل سهولة'}
          </p>
        </div>

        {/* Toggle */}
        <div className="flex gap-1 p-1 bg-white/10 backdrop-blur-md rounded-xl mb-6 border border-white/15">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mode === 'login' ? 'bg-white text-blue-900 shadow-md' : 'text-blue-100 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              mode === 'signup' ? 'bg-white text-blue-900 shadow-md' : 'text-blue-100 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            حساب جديد
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 border border-white/20">
          
          {/* Red Alert Note informing user that phone number is their login identifier */}
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-3 shadow-sm">
            <div className="w-7 h-7 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <p className="text-xs text-rose-950 leading-relaxed font-bold">
              تنبيه هامة: رقم الجوال الخاص بك هو الأساس في عملية التسجيل والدخول للحساب حتى تستطيع متابعة طلباتك بكل سهولة.
            </p>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                الاسم الكامل <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="أدخل اسمك الكامل"
                  className="input-field pr-12 bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>
            </div>
          )}

          {/* Phone / Identifier */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-blue-500" />
                {mode === 'login' ? 'رقم الجوال أو البريد الإلكتروني' : 'رقم الجوال'}
                <span className="text-rose-500">*</span>
              </span>
            </label>

            {mode === 'login' ? (
              <div className="relative">
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="رقم الجوال أو البريد الإلكتروني"
                  className="input-field pr-12 bg-slate-50 border-slate-200 text-slate-900"
                />
              </div>
            ) : (
              <div className="relative">
                <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="اكتب رقم الجوال ..."
                  dir="ltr"
                  className="input-field pr-12 text-right bg-slate-50 border-slate-200 text-slate-900 font-mono text-sm"
                />
              </div>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <span className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-500" />
                كلمة المرور <span className="text-rose-500">*</span>
              </span>
            </label>
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6 أحرف على الأقل"
                className="input-field pr-12 pl-12 bg-slate-50 border-slate-200 text-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Warning Box for Forgot Password (Only in Login Mode) */}
          {mode === 'login' && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 shadow-sm">
              <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                <HelpCircle className="w-4 h-4" />
              </div>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                إذا نسيت كلمة السر يمكنك التواصل مع الأدمن أو التواصل مع صاحب الصفحة حتى يتم حذف حسابك والرجوع لعمل حساب آخر.
              </p>
            </div>
          )}

          {/* Map & Location Section */}
          {mode === 'signup' && (
            <div className="space-y-4 pt-3 border-t border-slate-200/60">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  حدد موقعك على الخريطة
                </label>
              </div>

              {/* أزرار التحديد */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={locating}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-blue-500/20"
                >
                  {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  تحديد GPS تلقائي
                </button>
                <button
                  type="button"
                  onClick={openManualMapModal}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200 shadow-sm"
                >
                  <Compass className="w-4 h-4 text-blue-600" />
                  تحديد يدوي بالخريطة
                </button>
              </div>

              {/* معاينة الموقع */}
              <div 
                onClick={openManualMapModal}
                className="h-32 w-full rounded-2xl overflow-hidden border-2 border-blue-200 shadow-inner bg-blue-50/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-blue-100/50 transition-all p-4 text-center"
              >
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-slate-800">
                  {lat && lng ? 'تم تحديد الموقع بنجاح (انقر لتعديله على الخريطة)' : 'انقر لفتح الخريطة وتحديد موقعك'}
                </span>
                <span className="text-[10px] font-mono text-blue-600">
                  {lat?.toFixed(4)}, {lng?.toFixed(4)}
                </span>
              </div>

              {/* Detailed Address Field */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-blue-500" />
                    العنوان بالتفصيل
                  </span>
                </label>
                <textarea
                  rows={2}
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="مثال: الشارع، الحي، المدينة"
                  className="input-field bg-slate-50 border-slate-200 text-slate-900 text-sm resize-none py-2.5"
                />
              </div>

              {/* Building Details */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  رقم الشقة أو الدور <span className="text-slate-400 font-normal text-xs">(اختياري)</span>
                </label>
                <input
                  type="text"
                  value={buildingDetails}
                  onChange={(e) => setBuildingDetails(e.target.value)}
                  placeholder="مثال: الدور الثاني، شقة 5"
                  className="input-field bg-slate-50 border-slate-200 text-slate-900 text-sm"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary w-full !py-3.5 text-base font-bold shadow-lg shadow-blue-500/25 cursor-pointer">
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جاري المعالجة...
              </>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-5 h-5" />
                تسجيل الدخول
              </>
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                إنشاء الحساب وطلب المياه
              </>
            )}
          </button>
        </form>

        {/* النص باللون الذهبي الراقي في الأسفل */}
        <p className="text-center text-xs text-blue-200 mt-6">
          {mode === 'login' ? 'ليس لديك حساب؟ ' : 'لديك حساب بالفعل؟ '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
            className="text-amber-400 font-bold hover:text-amber-300 transition-colors underline decoration-amber-400/60 underline-offset-4 cursor-pointer drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
          >
            {mode === 'login' ? 'أنشئ حساب جديد' : 'سجل دخولك'}
          </button>
        </p>
      </div>

      {/* نافذة الخريطة التفاعلية الحقيقية */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-blue-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-400" />
                تحديد الموقع بدقة على الخريطة
              </h3>
              <button
                onClick={() => setShowMapModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span>انقر مباشرة على أي مكان في الخريطة أدناه لتحديد موقعك:</span>
              <span className="font-mono font-bold text-blue-600">
                {tempLat.toFixed(4)}, {tempLng.toFixed(4)}
              </span>
            </div>

            <div className="flex-1 min-h-[350px] relative bg-slate-100 p-2">
              <MapPicker
                lat={tempLat}
                lng={tempLng}
                defaultLat={tempLat}
                defaultLng={tempLng}
                onChange={(la, ln) => {
                  setTempLat(la);
                  setTempLng(ln);
                }}
              />
            </div>

            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowMapModal(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmMapSelection}
                className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                تأكيد هذا الموقع
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="py-6 text-center text-xs text-blue-300/60" dir="rtl">
        جميع الحقوق محفوظة &copy; <span dir="ltr">2026</span> {settings.business_name} - ياسر تامر محمد / <span dir="ltr">01013629789</span>.
      </footer>
    </div>
  );
}