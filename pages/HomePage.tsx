import { useEffect, useState } from 'react';
import { Droplets, MapPin, Clock, Shield, Truck, Phone, ChevronLeft, Star, Navigation, LogIn, UserCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/lib/auth';
import { buildWhatsAppUrl, normalizeSaudiPhone } from '@/lib/utils';
import type { Route } from '@/lib/router';
import { supabase } from '@/lib/supabase';

interface HomePageProps {
  navigate: (r: Route) => void;
}

const HERO_IMAGE = 'https://images.pexels.com/photos/16023092/pexels-photo-16023092.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

export function HomePage({ navigate }: HomePageProps) {
  const { settings, loading } = useSettings();
  const { customer } = useAuth();
  const [orderCount, setOrderCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => setOrderCount(count ?? 0));
  }, []);

  const handleWhatsApp = () => {
    if (!settings) return;
    const msg = 'السلام عليكم، أرغب في الاستفسار عن خدمة توصيل المياه';
    window.open(buildWhatsAppUrl(settings.whatsapp_number, msg), '_blank');
  };

  const handleLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
    });
  };

  if (loading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse">
          <Droplets className="w-12 h-12 text-blue-500 animate-bounce" />
        </div>
      </div>
    );
  }

  const rawCities = (settings as any).served_cities;
  const servedCitiesList: string[] = Array.isArray(rawCities)
    ? rawCities
    : typeof rawCities === 'string' && rawCities.trim()
    ? rawCities.split(',').map((c: string) => c.trim()).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-slate-50 text-right overflow-x-hidden" dir="rtl">
      {/* Header المرتب والممتد لأطراف الشاشة */}
      <header className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-slate-950/70 via-slate-950/35 to-transparent backdrop-blur-md">
        <div className="w-full px-6 sm:px-10 py-5 flex items-center justify-between">
          {/* الشعار أقصى اليمين */}
          <div className="flex items-center">
            <Logo logoUrl={settings.logo_url} businessName={settings.business_name} size="md" />
          </div>

          {/* زر تسجيل الدخول أقصى الشمال وبشكل أحمر جذاب */}
          <div className="flex items-center gap-3">
            {customer ? (
              <>
                <span className="hidden sm:inline text-sm font-bold text-white">{customer.name}</span>
                <button
                  onClick={() => navigate({ name: 'order' })}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-5 py-2.5 text-sm font-bold shadow-lg shadow-red-900/40 border border-red-500/30 transition-all cursor-pointer"
                >
                  <UserCircle className="w-4 h-4" />
                  حسابي
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate({ name: 'auth', tab: 'customer' })}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white px-6 py-2.5 text-sm font-bold shadow-lg shadow-red-900/40 border border-red-500/30 transition-all cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                تسجيل الدخول
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[100vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={HERO_IMAGE} alt="شاحنة توصيل المياه" className="w-full h-full object-cover scale-105" />
          <div className="absolute inset-0 bg-gradient-to-l from-blue-950/95 via-blue-950/85 to-blue-900/50" />
        </div>

        <div className="relative z-10 w-full px-6 sm:px-12 py-24">
          <div className="max-w-3xl text-right">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 mb-6 shadow-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
              </span>
              <span className="text-sm font-bold text-white">خدمة سريعة على مدار الساعة</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-tight mb-6 drop-shadow-md">
              مياه نقية
              <br />
              <span className="bg-gradient-to-l from-cyan-300 to-blue-400 bg-clip-text text-transparent">
                توصل إلى بابك
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-blue-100 leading-relaxed mb-8 max-w-2xl font-medium">
              {settings.business_name} — خدمة توصيل مياه الشرب في المملكة العربية السعودية. اطلب الآن واستمتع بمياه نقية ونظيفة خلال وقت قياسي.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-start">
              <button
                onClick={() => navigate(customer ? { name: 'order' } : { name: 'auth', tab: 'customer' })}
                className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-white px-8 py-4 text-lg font-bold text-blue-700 shadow-2xl shadow-blue-950/50 transition-all duration-300 hover:bg-blue-50 hover:scale-105 active:scale-100 cursor-pointer"
              >
                <Droplets className="w-6 h-6" />
                اطلب المياه
                <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              </button>
              <button
                onClick={handleWhatsApp}
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-[#25D366] px-8 py-4 text-lg font-bold text-white shadow-2xl shadow-green-950/40 transition-all duration-300 hover:bg-[#1eb856] hover:scale-105 active:scale-100 cursor-pointer"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.001-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.001 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                </svg>
                تواصل واتساب
              </button>
            </div>

            {/* المدن المخدومة */}
            {servedCitiesList.length > 0 && (
              <div className="mt-12 p-6 bg-black/50 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl max-w-lg text-right">
                <div className="flex items-center gap-2.5 text-blue-200 text-base font-bold mb-3">
                  <MapPin className="w-5 h-5 text-cyan-400 animate-bounce" />
                  <span>المدن المخدومة حالياً:</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {servedCitiesList.map((city, idx) => (
                    <span 
                      key={idx} 
                      className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-base sm:text-lg font-bold px-6 py-2.5 rounded-xl shadow-lg border border-white/20 tracking-wide"
                    >
                      {city}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section مع مسافات واسعة بين الكروت */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 mb-4">لماذا تختار {settings.business_name}؟</h2>
            <p className="text-lg sm:text-xl text-slate-500">نقدم لك أفضل خدمة توصيل مياه في المملكة بجودة عالية</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
            {[
              { icon: Truck, title: 'توصيل سريع', desc: 'نوصلك المياه خلال وقت قياسي إلى موقعك في جميع المدن المخدومة', color: 'from-blue-500 to-cyan-400' },
              { icon: Shield, title: 'مياه نقية ومعتمدة', desc: 'مياه شرب معتمدة من الجهات المختصة، نظيفة وآمنة للاستخدام اليومي', color: 'from-emerald-500 to-teal-400' },
              { icon: Phone, title: 'طلب سهل وسريع', desc: 'اطلب المياه بنقرة واحدة عبر الموقع أو الواتساب بكل سهولة ويسر', color: 'from-red-500 to-rose-400' },
            ].map((f, i) => (
              <div key={i} className="group p-8 lg:p-10 bg-slate-50 rounded-3xl border border-slate-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col items-start">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-6 shadow-xl group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-600 leading-relaxed text-base">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {orderCount !== null && (
        <section className="py-20 bg-gradient-to-l from-blue-700 to-cyan-600 shadow-inner">
          <div className="max-w-7xl mx-auto px-6 sm:px-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="text-white p-4">
                <div className="text-4xl sm:text-5xl font-black mb-2">{orderCount}+</div>
                <div className="text-blue-100 text-base font-medium">طلب تم توصيله</div>
              </div>
              <div className="text-white p-4">
                <div className="text-4xl sm:text-5xl font-black mb-2">24 ساعة</div>
                <div className="text-blue-100 text-base font-medium">خدمة متواصلة</div>
              </div>
              <div className="text-white p-4">
                <div className="text-4xl sm:text-5xl font-black mb-2">100%</div>
                <div className="text-blue-100 text-base font-medium">مياه نقية</div>
              </div>
              <div className="text-white p-4">
                <div className="text-4xl sm:text-5xl font-black mb-2">سريع</div>
                <div className="text-blue-100 text-base font-medium">توصيل خلال ساعة</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-1.5 mb-6 bg-amber-50 px-4 py-2 rounded-full border border-amber-200">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
            ))}
            <span className="text-sm font-bold text-amber-800 mr-2">خدمة موثوقة</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 mb-6">
            اطلب مياهك الآن بكل سهولة
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
            لا تحتاج إلا دقيقة واحدة لإكمال طلبك. مياه نقية ومعتمدة تصل إلى باب منزلك في أسرع وقت.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-5">
            <button
              onClick={() => navigate(customer ? { name: 'order' } : { name: 'auth', tab: 'customer' })}
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 text-lg font-bold shadow-xl shadow-blue-600/30 transition-all hover:scale-105 cursor-pointer"
            >
              <Droplets className="w-6 h-6" />
              اطلب المياه الآن
            </button>
            <button
              onClick={handleLocation}
              className="inline-flex items-center justify-center gap-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 px-10 py-4 text-lg font-bold shadow-md transition-all hover:scale-105 cursor-pointer border border-slate-300"
            >
              <Navigation className="w-5 h-5 text-blue-600" />
              حدد موقعي الحالي
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-300 py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6 sm:px-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-lg">
                <Droplets className="w-6 h-6" />
              </div>
              <div>
                <div className="text-lg font-bold text-white">{settings.business_name}</div>
                <div className="text-sm text-slate-400">خدمة توصيل المياه بالمملكة</div>
              </div>
            </div>
            <div className="flex items-center gap-8 text-base font-semibold">
              <button onClick={() => navigate(customer ? { name: 'order' } : { name: 'auth', tab: 'customer' })} className="hover:text-white transition-colors cursor-pointer">
                اطلب الآن
              </button>
              <button onClick={handleWhatsApp} className="hover:text-white transition-colors cursor-pointer">
                راسلنا واتساب
              </button>
            </div>
            <div className="text-base font-bold text-cyan-400" dir="ltr">
              {normalizeSaudiPhone(settings.whatsapp_number)}
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-slate-900 text-center text-sm text-slate-500">
            <span dir="ltr" className="inline-block">
              جميع الحقوق محفوظة &copy; {new Date().getFullYear()} {settings.business_name} - ياسر تامر محمد / 01013629789
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}