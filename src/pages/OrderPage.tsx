import { useState, useEffect } from 'react';
import { ArrowRight, Droplets, MapPin, FileText, Loader as Loader2, CircleAlert as AlertCircle, CircleCheck as CheckCircle2, CreditCard as Edit3, LogOut, MessageCircle, User, Phone, Clock, Sparkles, Code as Code2 } from 'lucide-react';

import { Logo } from '@/components/Logo';
import { MapPicker } from '@/components/MapPicker';
import { useSettings } from '@/hooks/useSettings';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { TANK_SIZES } from '@/types';
import type { Route } from '@/lib/router';

interface OrderPageProps {
  navigate: (r: Route) => void;
}

/*
 * نفس المفتاح الموجود في صفحة الإعدادات
 */
const WORK_HOURS_STORAGE_KEY = 'admin_work_hours';

const DEFAULT_WORK_FROM = '8:00 صباحاً';
const DEFAULT_WORK_TO = '10:00 مساؤً';

export function OrderPage({ navigate }: OrderPageProps) {
  const { settings, loading } = useSettings();
  const { customer, updateCustomerLocation, logoutCustomer } = useAuth();

  // بيانات الطلب
  const [tankSize, setTankSize] = useState('');
  const [notes, setNotes] = useState('');

  const [useSavedLocation, setUseSavedLocation] = useState(true);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [locationChanged, setLocationChanged] = useState(false);

  // بيانات العميل
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isEditingInfo, setIsEditingInfo] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /*
   * ساعات العمل
   * يتم تحميلها من نفس المكان الذي تحفظ فيه صفحة الإعدادات
   */
  const [workHoursFrom, setWorkHoursFrom] =
    useState(DEFAULT_WORK_FROM);

  const [workHoursTo, setWorkHoursTo] =
    useState(DEFAULT_WORK_TO);

  /*
   * قراءة ساعات العمل من localStorage
   */
  const loadWorkHours = () => {
    try {
      const savedWorkHours = localStorage.getItem(
        WORK_HOURS_STORAGE_KEY
      );

      if (savedWorkHours) {
        const parsed = JSON.parse(savedWorkHours);

        if (parsed?.from) {
          setWorkHoursFrom(parsed.from);
        } else {
          setWorkHoursFrom(DEFAULT_WORK_FROM);
        }

        if (parsed?.to) {
          setWorkHoursTo(parsed.to);
        } else {
          setWorkHoursTo(DEFAULT_WORK_TO);
        }
      } else {
        setWorkHoursFrom(DEFAULT_WORK_FROM);
        setWorkHoursTo(DEFAULT_WORK_TO);
      }
    } catch {
      setWorkHoursFrom(DEFAULT_WORK_FROM);
      setWorkHoursTo(DEFAULT_WORK_TO);
    }
  };

  /*
   * تحميل ساعات العمل عند فتح صفحة العميل
   */
  useEffect(() => {
    loadWorkHours();

    /*
     * استقبال التغيير من صفحة الإعدادات
     */
    const handleWorkHoursUpdated = () => {
      loadWorkHours();
    };

    window.addEventListener(
      'work-hours-updated',
      handleWorkHoursUpdated
    );

    /*
     * لو تغيرت localStorage من نافذة أو تبويب آخر
     */
    const handleStorage = (event: StorageEvent) => {
      if (event.key === WORK_HOURS_STORAGE_KEY) {
        loadWorkHours();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(
        'work-hours-updated',
        handleWorkHoursUpdated
      );

      window.removeEventListener(
        'storage',
        handleStorage
      );
    };
  }, []);

  /*
   * تحميل بيانات العميل
   */
  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setPhone(customer.phone || '');

      if (
        customer.latitude !== null &&
        customer.longitude !== null
      ) {
        setLat(customer.latitude);
        setLng(customer.longitude);
        setAddress(customer.address_text);
      }
    }
  }, [customer]);

  /*
   * التأكد من تسجيل دخول العميل
   */
  useEffect(() => {
    if (!loading && !customer) {
      navigate({
        name: 'auth',
        tab: 'customer',
      });
    }
  }, [loading, customer, navigate]);

  /*
   * شاشة التحميل
   */
  if (loading || !settings || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Droplets className="w-12 h-12 text-blue-500 animate-bounce" />
      </div>
    );
  }

  const hasSavedLocation =
    customer.latitude !== null &&
    customer.longitude !== null;

  /*
   * إرسال الطلب
   */
  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();

    const e: Record<string, string> = {};

    if (!name.trim()) {
      e.name = 'الرجاء إدخال الاسم';
    }

    if (!phone.trim()) {
      e.phone = 'الرجاء إدخال رقم الهاتف';
    }

    if (lat === null || lng === null) {
      e.location = 'الرجاء تحديد موقع التوصيل';
    }

    setErrors(e);

    if (Object.keys(e).length > 0) {
      return;
    }

    setSubmitting(true);

    /*
     * تحديث موقع العميل إذا تم تغييره
     */
    if (
      locationChanged &&
      lat !== null &&
      lng !== null
    ) {
      updateCustomerLocation(
        lat,
        lng,
        address
      );
    }

    /*
     * تحديث بيانات العميل
     */
    if (
      name !== customer.name ||
      phone !== customer.phone
    ) {
      await supabase
        .from('customers')
        .update({
          name,
          phone,
        })
        .eq('id', customer.id);
    }

    /*
     * إنشاء الطلب
     */
    const { data, error } = await supabase
      .from('orders')
      .insert({
        customer_name: name,
        phone: phone,
        latitude: lat,
        longitude: lng,
        address_text: address,
        tank_size: settings.show_tank_size
          ? tankSize
          : null,
        notes: notes || null,
        status: 'new',
        customer_id: customer.id,
      })
      .select('id')
      .single();

    setSubmitting(false);

    if (error) {
      setErrors({
        submit:
          'حدث خطأ أثناء إرسال الطلب. الرجاء المحاولة مرة أخرى.',
      });

      return;
    }

    navigate({
      name: 'success',
      orderId: data.id,
    });
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-100 pb-12"
      dir="rtl"
    >
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">

          <button
            onClick={() =>
              navigate({
                name: 'home',
              })
            }
            className="group flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors bg-slate-100 hover:bg-blue-50 px-3 py-1.5 rounded-xl text-sm font-semibold cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />

            <span>الرئيسية</span>
          </button>

          <Logo
            logoUrl={settings.logo_url}
            businessName={settings.business_name}
            size="sm"
          />

          <button
            onClick={() => {
              logoutCustomer();

              navigate({
                name: 'home',
              });
            }}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-rose-600 transition-colors bg-slate-100 hover:bg-rose-50 px-3 py-1.5 rounded-xl font-semibold cursor-pointer"
          >
            <LogOut className="w-4 h-4" />

            <span className="hidden sm:inline">
              خروج
            </span>
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8">

        {/* Title Section */}
        <div className="text-center mb-6">

          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white shadow-xl shadow-blue-500/25 mb-4 ring-4 ring-blue-50">
            <Droplets className="w-8 h-8 animate-pulse" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            طلب توصيل مياه
          </h1>

          <p className="text-slate-500 text-sm sm:text-base">
            مرحباً{' '}
            <span className="text-blue-600 font-bold">
              {name}
            </span>
            ! حدد متطلباتك وسنوصل طلبك في أسرع وقت
          </p>
        </div>

        {/* ساعات العمل */}
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl p-3.5 sm:p-4 mb-6 flex items-center gap-3 shadow-xs">

          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
            <Clock className="w-4 h-4" />
          </div>

          <div className="text-xs sm:text-sm font-bold text-amber-900 leading-relaxed">

            مواعيد العمل الرسمية: الخدمة متاحة يومياً من الساعة{' '}

            <span className="underline decoration-amber-400">
              {workHoursFrom}
            </span>

            {' '}وحتى الساعة{' '}

            <span className="underline decoration-amber-400">
              {workHoursTo}
            </span>

            .

          </div>
        </div>

        {/* Customer Info Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 mb-6 shadow-sm border border-slate-200/80">

          <div className="flex items-center justify-between mb-3">

            <div className="flex items-center gap-3">

              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                {name
                  ? name.charAt(0)
                  : 'ع'}
              </div>

              <div>
                <div className="text-xs text-slate-400 font-medium">
                  بيانات صاحب الطلب
                </div>

                <div className="font-bold text-slate-900 text-base">
                  {name}
                </div>
              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setIsEditingInfo(
                  !isEditingInfo
                )
              }
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />

              {isEditingInfo
                ? 'إلغاء التعديل'
                : 'تعديل الاسم / الرقم'}
            </button>

          </div>

          {!isEditingInfo ? (

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-sm">

              <span
                className="text-slate-500 font-mono"
                dir="ltr"
              >
                {phone}
              </span>

              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-lg">

                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />

                حساب مسجل
              </span>

            </div>

          ) : (

            <div className="pt-3 border-t border-slate-100 space-y-3 animate-fadeIn">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                {/* الاسم */}
                <div>

                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الاسم
                  </label>

                  <div className="relative">

                    <User className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />

                    <input
                      type="text"
                      value={name}
                      onChange={(e) =>
                        setName(
                          e.target.value
                        )
                      }
                      placeholder="أدخل اسمك"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pr-9 pl-3 py-2 text-sm text-slate-800 focus:bg-white focus:border-blue-600 outline-none transition-all"
                    />

                  </div>

                  {errors.name && (
                    <p className="text-xs text-rose-600 mt-1">
                      {errors.name}
                    </p>
                  )}

                </div>

                {/* الهاتف */}
                <div>

                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهاتف
                  </label>

                  <div className="relative">

                    <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />

                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) =>
                        setPhone(
                          e.target.value
                        )
                      }
                      placeholder="01012345678"
                      dir="ltr"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-800 text-left focus:bg-white focus:border-blue-600 outline-none transition-all font-mono"
                    />

                  </div>

                  {errors.phone && (
                    <p className="text-xs text-rose-600 mt-1">
                      {errors.phone}
                    </p>
                  )}

                </div>

              </div>

              <p className="text-xs text-blue-600">
                سيتم تحديث هذه البيانات في طلبك الحالي وحسابك.
              </p>

            </div>
          )}
        </div>

        {/* Main Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-200/80 space-y-6"
        >

          {/* Tank Size */}
          {settings.show_tank_size && (
            <div>

              <label className="block text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>

                اختر حجم التنك المطلوب
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

                {TANK_SIZES.map((size) => (

                  <button
                    key={size}
                    type="button"
                    onClick={() =>
                      setTankSize(size)
                    }
                    className={`rounded-2xl border-2 p-4 text-center font-bold transition-all duration-200 cursor-pointer ${
                      tankSize === size
                        ? 'border-blue-600 bg-blue-50/70 text-blue-700 shadow-md shadow-blue-500/10 scale-[1.02]'
                        : 'border-slate-100 bg-slate-50/50 text-slate-600 hover:border-slate-200 hover:bg-slate-100/50'
                    }`}
                  >
                    <span className="block text-base sm:text-lg">
                      {size}
                    </span>
                  </button>

                ))}

              </div>
            </div>
          )}

          {/* Location */}
          <div className="space-y-3">

            <label className="block text-sm font-bold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>

              موقع التوصيل{' '}
              <span className="text-rose-500">
                *
              </span>
            </label>

            {hasSavedLocation &&
            !locationChanged ? (

              <div className="space-y-3">

                <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-4 transition-all">

                  <div className="flex items-start gap-3.5">

                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">

                      <MapPin className="w-5 h-5" />

                    </div>

                    <div className="flex-1 min-w-0">

                      <div className="text-sm font-bold text-slate-900 mb-0.5">
                        موقعك المحفوظ مسبقاً
                      </div>

                      {customer.address_text && (
                        <div className="text-sm text-slate-600 mb-1">
                          {customer.address_text}
                        </div>
                      )}

                      <div
                        className="text-xs text-slate-400 font-mono"
                        dir="ltr"
                      >
                        {customer.latitude?.toFixed(
                          6
                        )}
                        ,{' '}
                        {customer.longitude?.toFixed(
                          6
                        )}
                      </div>

                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">

                  <button
                    type="button"
                    onClick={() =>
                      setUseSavedLocation(true)
                    }
                    className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all cursor-pointer ${
                      useSavedLocation
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />

                    استخدام هذا الموقع
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLocationChanged(
                        true
                      );

                      setUseSavedLocation(
                        false
                      );
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4 text-slate-500" />

                    تحديد موقع جديد على الخريطة
                  </button>

                </div>

              </div>

            ) : (

              <div className="space-y-3">

                {locationChanged &&
                  hasSavedLocation && (

                    <button
                      type="button"
                      onClick={() => {

                        setLocationChanged(
                          false
                        );

                        setUseSavedLocation(
                          true
                        );

                        setLat(
                          customer.latitude
                        );

                        setLng(
                          customer.longitude
                        );

                        setAddress(
                          customer.address_text
                        );

                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1.5 bg-blue-50 px-3 py-2 rounded-xl w-fit transition-colors cursor-pointer"
                    >
                      <ArrowRight className="w-4 h-4" />

                      العودة للموقع المحفوظ سريعاً
                    </button>

                  )}

                <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner">

                  <MapPicker
                    lat={lat}
                    lng={lng}
                    defaultLat={
                      customer.latitude ??
                      settings.map_default_lat
                    }
                    defaultLng={
                      customer.longitude ??
                      settings.map_default_lng
                    }
                    onChange={(
                      la,
                      ln,
                      addr
                    ) => {

                      setLat(la);
                      setLng(ln);
                      setAddress(
                        addr ?? null
                      );
                      setLocationChanged(
                        true
                      );

                    }}
                  />

                </div>

              </div>
            )}

            {errors.location && (

              <p className="text-xs font-bold text-rose-600 flex items-center gap-1.5 mt-1 bg-rose-50 p-2.5 rounded-xl border border-rose-100">

                <AlertCircle className="w-4 h-4 shrink-0" />

                {errors.location}

              </p>

            )}

            {address &&
              locationChanged && (

                <div className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">

                  <MapPin className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />

                  <span className="font-medium">
                    {address}
                  </span>

                </div>

              )}

          </div>

          {/* Notes */}
          <div>

            <label className="block text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">

              <span className="w-2 h-2 rounded-full bg-slate-400"></span>

              ملاحظات إضافية{' '}

              <span className="text-slate-400 font-normal text-xs">
                (اختياري)
              </span>

            </label>

            <div className="relative">

              <FileText className="absolute right-4 top-3.5 w-5 h-5 text-slate-400" />

              <textarea
                value={notes}
                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }
                placeholder="أضف أي تفاصيل تفيد الكابتن في الوصول لمنزلك بسهولة..."
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pr-12 pl-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none transition-all"
              />

            </div>
          </div>

          {/* Error */}
          {errors.submit && (

            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-center gap-2.5 font-medium">

              <AlertCircle className="w-5 h-5 shrink-0" />

              {errors.submit}

            </div>

          )}

          {/* WhatsApp Notice */}
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200/80 p-4 flex items-start gap-3 text-emerald-900 shadow-xs">

            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">

              <MessageCircle className="w-4 h-4" />

            </div>

            <div className="text-xs sm:text-sm leading-relaxed">

              <span className="font-bold block mb-0.5 text-emerald-950">
                ملاحظة هامة جداً لخدمتك بشكل أسرع:
              </span>

              بعد إتمام الطلب والضغط على زر الإرسال، يرجى النقر على زر{' '}

              <strong className="text-emerald-700 underline font-bold">
                إرسال الرسالة إلى الواتساب
              </strong>{' '}

              لضمان وصول تفاصيل طلبك مباشرة إلينا في أسرع وقت ممكن!

            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-bold text-base sm:text-lg py-4 shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-3 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
          >

            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />

                جاري إرسال طلبك...
              </>
            ) : (
              <>
                <Droplets className="w-6 h-6" />

                إرسال الطلب الآن
              </>
            )}

          </button>

     {/* Developer Card */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-5 text-white shadow-lg relative overflow-hidden">
              <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none"></div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3 text-center sm:text-right">
                  <div className="w-11 h-11 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                    <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs text-blue-300/80 font-medium flex items-center gap-1 justify-center sm:justify-start">
                      <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>تصميم وتطوير النظام</span>
                    </div>
                    <div className="font-extrabold text-base tracking-wide text-white flex items-center gap-1.5 justify-center sm:justify-start">
                      <span>المهندس ياسر تامر</span>
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-center">
                  
                  {/* WhatsApp */}
                  <a
                    href="https://wa.me/201013629789"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="واتساب"
                    className="w-10 h-10 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/30 text-emerald-400 hover:text-white flex items-center justify-center transition-all shadow-sm hover:scale-110 cursor-pointer"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                  </a>

                  {/* Facebook */}
                  <a
                    href="https://www.facebook.com/share/198hNsCbx2/?mibextid=wwXIfr"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="فيسبوك"
                    className="w-10 h-10 rounded-xl bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-400 hover:text-white flex items-center justify-center transition-all shadow-sm hover:scale-110 cursor-pointer"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>

                  {/* Instagram - Standard Clear Camera Path */}
                  <a
                    href="https://www.instagram.com/yassertamer10?igsi=MWtxdTY0Z25wbXEy"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="انستجرام"
                    className="w-10 h-10 rounded-xl bg-pink-600/20 hover:bg-pink-600 border border-pink-500/30 text-pink-400 hover:text-white flex items-center justify-center transition-all shadow-sm hover:scale-110 cursor-pointer"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.28-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618-6.98-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>

                  {/* Snapchat - Exact Clean Ghost Path */}
                  <a
                    href="https://www.snapchat.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="سناب شات"
                    className="w-10 h-10 rounded-xl bg-amber-500/20 hover:bg-amber-500 border border-amber-500/30 text-amber-400 hover:text-white flex items-center justify-center transition-all shadow-sm hover:scale-110 cursor-pointer"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 512 512">
                      <path d="M256.03 32c-56.12 0-107.41 20.9-146.46 55.43-15.15 13.39-26.6 29.83-34.1 48.72-8.38 21.2-11.19 44.5-8.21 68.3 4.29 34.02 21.03 62.06 48.42 81.33 13.91 9.71 30.63 16.1 48.53 19.3-1.63 6.27-2.6 12.87-2.76 19.8-.3 13.27 4.19 25.13 13.1 35.15 9.07 10.23 21.46 16.03 36.43 17.15 4.36.33 8.35 1.94 11.66 4.7 6.42 5.37 9.87 12.92 10.15 22.18.3 9.77-3.76 18.23-11.95 24.87-10.87 8.84-17.71 20.37-20.19 33.91-1.39 7.6.93 14.36 6.81 19.86 6.51 6.06 14.54 9.17 23.77 9.17 8.16 0 15.65-2.58 22.12-7.61 7.14-5.54 13.04-12.42 17.5-20.35 3.32-5.87 6.78-11.66 10.46-17.3 1.92-2.96 5.09-4.7 8.76-4.96 3.63-.26 6.84 1.25 8.97 4.3 3.73 5.37 7.27 10.9 10.66 16.48 4.4 7.29 10.16 13.62 17.02 18.78 6.55 4.96 14.07 7.47 22.25 7.47 9.53 0 17.76-3.21 24.3-9.45 6.13-5.8 8.65-12.84 7.33-20.73-2.67-15.86-9.69-28.48-20.78-37.45-7.73-6.26-11.63-14.51-11.53-24.32.1-9.28 3.57-16.89 9.88-22.37 3.24-2.79 7.15-4.42 11.45-4.78 14.77-1.23 27.05-6.99 36.17-17.07 8.84-9.84 13.25-21.57 12.95-34.61-.17-6.94-1.15-13.54-2.79-19.81 17.9-3.21 34.62-9.59 48.53-19.3 27.39-19.27 44.13-47.31 48.42-81.33 2.98-23.8 0.17-47.1-8.21-68.3-7.5-18.89-18.95-35.33-34.1-48.72-39.05-34.53-90.34-55.43-146.46-55.43z"/>
                    </svg>
                  </a>

                  {/* X / Twitter */}
                  <a
                    href="https://twitter.com/YASSERTAMER11"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="تويتر / إكس"
                    className="w-10 h-10 rounded-xl bg-sky-600/20 hover:bg-sky-600 border border-sky-500/30 text-sky-400 hover:text-white flex items-center justify-center transition-all shadow-sm hover:scale-110 cursor-pointer"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>

                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 pt-1">
            بالضغط على إرسال الطلب، أنت توافق على أن يتواصل معك فريق{' '}
            <span className="font-bold text-slate-600">
              {settings.business_name}
            </span>{' '}
            لتأكيد الطلب.
          </p>

        </form>
      </div>
    </div>
  );
}