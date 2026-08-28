import { useEffect, useState, useRef } from 'react';
import { Droplets, Save, Check, Plus, X, MapPin, Phone, MessageSquare, Image, Eye, Building2, Loader as Loader2, Upload, Trash2, Clock, RotateCcw, TriangleAlert as AlertTriangle } from 'lucide-react';
import { DashboardHeader } from '@/pages/DashboardPage';
import { useSettings } from '@/hooks/useSettings';
import { useAdminAuth } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';
import { clearSettingsCache } from '@/lib/settings';
import { normalizeSaudiPhone } from '@/lib/utils';
import type { Route } from '@/lib/router';

interface SettingsPageProps {
  navigate: (r: Route) => void;
}

const HOURS_OPTIONS = [
  '12:00 صباحاً',
  '1:00 صباحاً',
  '2:00 صباحاً',
  '3:00 صباحاً',
  '4:00 صباحاً',
  '5:00 صباحاً',
  '6:00 صباحاً',
  '7:00 صباحاً',
  '8:00 صباحاً',
  '9:00 صباحاً',
  '10:00 صباحاً',
  '11:00 صباحاً',
  '12:00 ظهراً',
  '1:00 مساءً',
  '2:00 مساءً',
  '3:00 مساءً',
  '4:00 مساءً',
  '5:00 مساءً',
  '6:00 مساءً',
  '7:00 مساءً',
  '8:00 مساءً',
  '9:00 مساءً',
  '10:00 مساءً',
  '11:00 مساءً',
];

const DEFAULT_WORK_FROM = '8:00 صباحاً';
const DEFAULT_WORK_TO = '10:00 مساءً';

// مفتاح تخزين ساعات العمل في المتصفح
const WORK_HOURS_STORAGE_KEY = 'admin_work_hours';

export function SettingsPage({ navigate }: SettingsPageProps) {
  const { settings, loading } = useSettings();
  const { admin, logoutAdmin } = useAdminAuth();

  const [form, setForm] = useState({
    business_name: '',
    logo_url: '',
    whatsapp_number: '',
    confirmation_message: '',
    served_cities: [] as string[],
    show_tank_size: true,
    map_default_lat: 24.7136,
    map_default_lng: 46.6753,
    work_hours_from: DEFAULT_WORK_FROM,
    work_hours_to: DEFAULT_WORK_TO,
  });

  const [newCity, setNewCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [clearingProfit, setClearingProfit] = useState(false);
  const [clearingOrders, setClearingOrders] = useState(false);
  const [factoryResetting, setFactoryResetting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // تحميل الإعدادات
  useEffect(() => {
    if (settings) {
      let workHoursFrom = DEFAULT_WORK_FROM;
      let workHoursTo = DEFAULT_WORK_TO;

      /*
       * ساعات العمل يتم قراءتها من localStorage
       * وليس من Supabase.
       */
      try {
        const savedWorkHours = localStorage.getItem(
          WORK_HOURS_STORAGE_KEY
        );

        if (savedWorkHours) {
          const parsed = JSON.parse(savedWorkHours);

          if (parsed?.from) {
            workHoursFrom = parsed.from;
          }

          if (parsed?.to) {
            workHoursTo = parsed.to;
          }
        }
      } catch {
        // في حالة وجود قيمة تالفة نستخدم القيم الافتراضية
      }

      setForm({
        business_name: settings.business_name,
        logo_url: settings.logo_url ?? '',
        whatsapp_number: settings.whatsapp_number,
        confirmation_message: settings.confirmation_message,
        served_cities: settings.served_cities,
        show_tank_size: settings.show_tank_size,
        map_default_lat: settings.map_default_lat,
        map_default_lng: settings.map_default_lng,
        work_hours_from: workHoursFrom,
        work_hours_to: workHoursTo,
      });
    }
  }, [settings]);

  // التحقق من دخول الأدمن
  useEffect(() => {
    if (!loading && !admin) {
      navigate({ name: 'auth', tab: 'admin' });
    }
  }, [loading, admin, navigate]);

  if (loading || !settings || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Droplets className="w-12 h-12 text-blue-500 animate-bounce" />
      </div>
    );
  }

  const addCity = () => {
    const city = newCity.trim();

    if (city && !form.served_cities.includes(city)) {
      setForm({
        ...form,
        served_cities: [...form.served_cities, city],
      });

      setNewCity('');
    }
  };

  const removeCity = (city: string) => {
    setForm({
      ...form,
      served_cities: form.served_cities.filter((c) => c !== city),
    });
  };

  // رفع الشعار
  const handleLogoUpload = async (file: File) => {
    setError(null);

    if (file.size > 2 * 1024 * 1024) {
      setError('حجم الصورة يجب ألا يتجاوز 2 ميجابايت');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('الرجاء اختيار ملف صورة صحيح');
      return;
    }

    setUploadingLogo(true);

    const ext = file.name.split('.').pop() || 'png';
    const fileName = `logos/logo-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('logos')
      .upload(fileName, file, {
        upsert: true,
      });

    if (upErr) {
      setError('فشل رفع الصورة. حاول مرة أخرى.');
      setUploadingLogo(false);
      return;
    }

    const { data: pub } = supabase.storage
      .from('logos')
      .getPublicUrl(fileName);

    setForm({
      ...form,
      logo_url: pub.publicUrl,
    });

    setUploadingLogo(false);
  };

  const handleLogoDelete = () => {
    setForm({
      ...form,
      logo_url: '',
    });
  };

  // حفظ الإعدادات
  const handleSave = async () => {
    setError(null);

    if (!form.business_name.trim()) {
      setError('الرجاء إدخال اسم النشاط');
      return;
    }

    const cleanPhone = form.whatsapp_number.replace(/\D/g, '');

    const isValidPhone =
      /^((05\d{8})|(9665\d{8}))$/.test(cleanPhone);

    if (!isValidPhone) {
      setError(
        'رقم الواتساب غير صحيح (يجب أن يبدأ بـ 966 أو 05 ويتكون من الرقم الصحيح)'
      );
      return;
    }

    setSaving(true);

    const updateData = {
      business_name: form.business_name.trim(),
      logo_url: form.logo_url.trim() || null,
      whatsapp_number: normalizeSaudiPhone(form.whatsapp_number),
      confirmation_message: form.confirmation_message.trim(),
      served_cities: form.served_cities,
      show_tank_size: form.show_tank_size,
      map_default_lat: form.map_default_lat,
      map_default_lng: form.map_default_lng,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase
      .from('settings')
      .update(updateData)
      .eq('id', 1);

    if (updateError) {
      setSaving(false);
      setError(`خطأ قاعدة البيانات: ${updateError.message}`);
      return;
    }

    /*
     * حفظ ساعات العمل في المتصفح.
     */
    localStorage.setItem(
      WORK_HOURS_STORAGE_KEY,
      JSON.stringify({
        from: form.work_hours_from,
        to: form.work_hours_to,
      })
    );

    window.dispatchEvent(
      new Event('work-hours-updated')
    );

    clearSettingsCache();

    setSaving(false);
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 3000);
  };

  // تصفير أرباح الشهر الحالي
  const handleClearCurrentMonthProfit = async () => {
    if (
      !window.confirm(
        'هل أنت متأكد من تصفير أرباح الشهر الحالي ونقلها لتكون أرباح الشهر السابق للمقارنة؟'
      )
    ) {
      return;
    }

    setClearingProfit(true);

    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*');

      let currentTotalProfit = 0;

      if (ordersData) {
        const factoryResetDate =
          localStorage.getItem('factory_reset_date');

        const factoryResetTime = factoryResetDate
          ? new Date(factoryResetDate).getTime()
          : 0;

        const clearOrdersDate =
          localStorage.getItem('clear_orders_date');

        const clearOrdersTime = clearOrdersDate
          ? new Date(clearOrdersDate).getTime()
          : 0;

        const activeResetTime = Math.max(
          factoryResetTime,
          clearOrdersTime
        );

        const cycleStart =
          localStorage.getItem('cycle_start_date');

        const cycleStartTime = cycleStart
          ? new Date(cycleStart).getTime()
          : activeResetTime;

        let deletedPhones: string[] = [];

        try {
          const savedDeleted = localStorage.getItem(
            'deleted_customers_phones'
          );

          if (savedDeleted) {
            deletedPhones = JSON.parse(savedDeleted);
          }
        } catch {}

        let deletedOrderIds: string[] = [];

        try {
          const savedDeletedOrders =
            localStorage.getItem('deleted_orders');

          if (savedDeletedOrders) {
            deletedOrderIds = JSON.parse(savedDeletedOrders);
          }
        } catch {}

        const validOrders = (ordersData as any[]).filter(
          (o) =>
            !deletedPhones.includes(o.phone) &&
            !deletedOrderIds.includes(String(o.id))
        );

        const activeOrders = validOrders.filter(
          (o) =>
            new Date(o.created_at).getTime() >=
            activeResetTime
        );

        const currentCycleOrders = activeOrders.filter(
          (o) =>
            new Date(o.created_at).getTime() >=
            cycleStartTime
        );

        currentTotalProfit = currentCycleOrders.reduce(
          (sum, o) => {
            const localPaid = localStorage.getItem(
              `order_paid_${o.id}`
            );

            const paid =
              localPaid !== null
                ? Number(localPaid) || 0
                : Number(o.paid_amount) || 0;

            return sum + paid;
          },
          0
        );
      }

      localStorage.setItem(
        'last_month_profit',
        currentTotalProfit.toString()
      );

      localStorage.setItem(
        'cycle_start_date',
        new Date().toISOString()
      );

      localStorage.setItem(
        'current_month_profit_reset',
        Date.now().toString()
      );

      window.dispatchEvent(
        new Event('local-storage-updated')
      );

      alert(
        `تم تصفير أرباح الشهر الحالي وترحيل مبلغ (${currentTotalProfit} ر.س) لأرباح الشهر السابق بنجاح!`
      );

      window.location.reload();
    } catch {
      alert('حدث خطأ أثناء تصفير الأرباح.');
    } finally {
      setClearingProfit(false);
    }
  };

  // حذف جميع الطلبات
  const handleClearOrdersCounters = async () => {
    if (
      !window.confirm(
        'تحذير: سيتم حذف جميع الطلبات والسجلات من قاعدة البيانات نهائياً. هل أنت متأكد؟'
      )
    ) {
      return;
    }

    setClearingOrders(true);

    try {
      const { error: deleteError } = await supabase
        .from('orders')
        .delete()
        .not('id', 'is', null);

      if (deleteError) {
        throw deleteError;
      }

      clearSettingsCache();

      window.dispatchEvent(
        new Event('local-storage-updated')
      );

      alert(
        'تم مسح وحذف كافة الطلبات من قاعدة البيانات بنجاح.'
      );

      window.location.reload();
    } catch (err: any) {
      alert(
        'حدث خطأ أثناء حذف الطلبات من قاعدة البيانات: ' +
          (err.message || 'خطأ غير معروف')
      );
    } finally {
      setClearingOrders(false);
    }
  };

  // ضبط المصنع
  const handleFactoryReset = async () => {
    if (
      !window.confirm(
        'تحذير خطير جداً: سيتم حذف جميع الطلبات، وتصفير أرباح الشهر السابق ومعدل النمو، مع الاحتفاظ بساعات العمل والمدن المخدومة وحالة حقل حجم التانك. هل تريد المتابعة؟'
      )
    ) {
      return;
    }

    setFactoryResetting(true);

    try {
      await supabase
        .from('orders')
        .delete()
        .not('id', 'is', null);

      await supabase
        .from('settings')
        .update({
          business_name: 'مياه الصفا',
          logo_url: null,
          served_cities: form.served_cities,
          show_tank_size: form.show_tank_size,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      const currentWorkHoursFrom = form.work_hours_from;
      const currentWorkHoursTo = form.work_hours_to;

      localStorage.clear();
      sessionStorage.clear();

      localStorage.setItem(
        WORK_HOURS_STORAGE_KEY,
        JSON.stringify({
          from: currentWorkHoursFrom,
          to: currentWorkHoursTo,
        })
      );

      localStorage.setItem(
        'factory_reset_date',
        new Date().toISOString()
      );

      localStorage.setItem(
        'last_month_profit',
        '0'
      );

      localStorage.setItem(
        'cycle_start_date',
        new Date().toISOString()
      );

      clearSettingsCache();

      window.dispatchEvent(
        new Event('local-storage-updated')
      );

      window.dispatchEvent(
        new Event('work-hours-updated')
      );

      alert(
        'تم إجراء ضبط مصنع كامل (مع الحفاظ على ساعات العمل، المدن المخدومة، وحجم التانك) بنجاح.'
      );

      logoutAdmin();

      navigate({
        name: 'home',
      });
    } catch (err: any) {
      alert(
        'حدث خطأ أثناء تنفيذ ضبط المصنع: ' +
          (err.message || '')
      );

      setFactoryResetting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-50"
      dir="rtl"
    >
      <DashboardHeader
        settings={settings}
        navigate={navigate}
        active="settings"
        onLogout={() => {
          logoutAdmin();
          navigate({
            name: 'home',
          });
        }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          الإعدادات
        </h1>

        <p className="text-slate-500 mb-8">
          تعديل معلومات النشاط وإعدادات التطبيق والأمان
        </p>

        {/* Business Name */}
        <div className="card p-6 mb-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-500" />
            اسم النشاط
          </label>

          <input
            type="text"
            value={form.business_name}
            onChange={(e) =>
              setForm({
                ...form,
                business_name: e.target.value,
              })
            }
            placeholder="مثال: مياه الصفا"
            className="input-field"
          />
        </div>

        {/* Logo Upload */}
        <div className="card p-6 mb-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Image className="w-4 h-4 text-blue-500" />
            شعار النشاط
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];

              if (f) {
                handleLogoUpload(f);
              }

              e.target.value = '';
            }}
            className="hidden"
          />

          {form.logo_url ? (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50">
              <img
                src={form.logo_url}
                alt="معاينة الشعار"
                className="w-16 h-16 rounded-xl object-cover border border-slate-200"
              />

              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-700">
                  تم رفع الشعار
                </div>

                <div className="text-xs text-slate-400 mt-0.5">
                  اضغط للتغيير أو الحذف
                </div>
              </div>

              <button
                onClick={() =>
                  fileInputRef.current?.click()
                }
                disabled={uploadingLogo}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                تغيير
              </button>

              <button
                onClick={handleLogoDelete}
                disabled={uploadingLogo}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف
              </button>
            </div>
          ) : (
            <button
              onClick={() =>
                fileInputRef.current?.click()
              }
              disabled={uploadingLogo}
              className="w-full flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 transition-all cursor-pointer"
            >
              {uploadingLogo ? (
                <>
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />

                  <span className="text-sm font-semibold text-slate-600">
                    جاري الرفع...
                  </span>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-blue-600" />
                  </div>

                  <div className="text-center">
                    <div className="text-sm font-semibold text-slate-700">
                      اضغط لرفع الشعار
                    </div>

                    <div className="text-xs text-slate-400 mt-1">
                      PNG, JPG, SVG — أقصى حجم 2 ميجابايت
                    </div>
                  </div>
                </>
              )}
            </button>
          )}
        </div>

        {/* Work Hours */}
        <div className="card p-6 mb-4 bg-white rounded-xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                ساعات العمل والتنبيه للعملاء
              </h3>

              <p className="text-xs text-slate-400 mt-0.5">
                اختر وقت بدء وانتهاء العمل لتظهر للعملاء في صفحة الطلب
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                من الساعة
              </label>

              <select
                value={form.work_hours_from}
                onChange={(e) =>
                  setForm({
                    ...form,
                    work_hours_from: e.target.value,
                  })
                }
                className="input-field text-sm cursor-pointer"
              >
                {HOURS_OPTIONS.map((time) => (
                  <option
                    key={`from-${time}`}
                    value={time}
                  >
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                إلى الساعة
              </label>

              <select
                value={form.work_hours_to}
                onChange={(e) =>
                  setForm({
                    ...form,
                    work_hours_to: e.target.value,
                  })
                }
                className="input-field text-sm cursor-pointer"
              >
                {HOURS_OPTIONS.map((time) => (
                  <option
                    key={`to-${time}`}
                    value={time}
                  >
                    {time}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* WhatsApp Number */}
        <div className="card p-6 mb-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <Phone className="w-4 h-4 text-blue-500" />
            رقم الواتساب (صاحب النشاط)
          </label>

          <input
            type="tel"
            value={form.whatsapp_number}
            onChange={(e) =>
              setForm({
                ...form,
                whatsapp_number: e.target.value,
              })
            }
            placeholder="9665xxxxxxxx أو 05xxxxxxxx"
            dir="ltr"
            className="input-field text-right"
          />

          <p className="mt-2 text-xs text-slate-400">
            يمكنك كتابة الرقم بالمفتاح الدولي (9665...) أو المحلي (05...).
          </p>
        </div>

        {/* Confirmation Message */}
        <div className="card p-6 mb-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            رسالة تأكيد الطلب
          </label>

          <textarea
            value={form.confirmation_message}
            onChange={(e) =>
              setForm({
                ...form,
                confirmation_message: e.target.value,
              })
            }
            rows={3}
            className="input-field resize-none"
          />

          <p className="mt-2 text-xs text-slate-400">
            تظهر هذه الرسالة للعميل بعد إرسال الطلب بنجاح.
          </p>
        </div>

        {/* Served Cities */}
        <div className="card p-6 mb-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            المدن المخدومة
          </label>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newCity}
              onChange={(e) =>
                setNewCity(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCity();
                }
              }}
              placeholder="أضف مدينة جديدة..."
              className="input-field flex-1"
            />

            <button
              onClick={addCity}
              className="btn-secondary !px-4 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {form.served_cities.map((city) => (
              <span
                key={city}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 text-sm font-medium text-blue-700"
              >
                {city}

                <button
                  onClick={() =>
                    removeCity(city)
                  }
                  className="hover:bg-blue-100 rounded-full p-0.5 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}

            {form.served_cities.length === 0 && (
              <p className="text-sm text-slate-400">
                لا توجد مدن مضافة بعد.
              </p>
            )}
          </div>
        </div>

        {/* Show Tank Size Toggle */}
        <div className="card p-6 mb-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-500" />
                إظهار حقل حجم التنك
              </div>

              <p className="text-xs text-slate-400">
                عند التفعيل، سيظهر حقل اختيار حجم التنك في نموذج الطلب.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setForm({
                  ...form,
                  show_tank_size: !form.show_tank_size,
                })
              }
              className={`relative w-12 h-7 rounded-full transition-colors cursor-pointer ${
                form.show_tank_size
                  ? 'bg-blue-600'
                  : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-all ${
                  form.show_tank_size
                    ? 'right-1'
                    : 'right-6'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Default Map Location */}
        <div className="card p-6 mb-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-500" />
            موقع الخريطة الافتراضي
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                خط العرض
              </label>

              <input
                type="number"
                step="any"
                value={form.map_default_lat}
                onChange={(e) =>
                  setForm({
                    ...form,
                    map_default_lat:
                      parseFloat(e.target.value) || 0,
                  })
                }
                dir="ltr"
                className="input-field text-right"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1">
                خط الطول
              </label>

              <input
                type="number"
                step="any"
                value={form.map_default_lng}
                onChange={(e) =>
                  setForm({
                    ...form,
                    map_default_lng:
                      parseFloat(e.target.value) || 0,
                  })
                }
                dir="ltr"
                className="input-field text-right"
              />
            </div>
          </div>

          <p className="mt-2 text-xs text-slate-400">
            الموقع الذي تظهر عنده الخريطة افتراضياً في نموذج الطلب.
          </p>
        </div>

        {/* Reset Actions */}
        <div className="card p-6 mb-6 bg-white rounded-xl shadow-sm border border-slate-200 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-blue-500" />
              إعادة ضبط الإحصائيات والأرباح ولوحة التحكم
            </h3>

            <p className="text-xs text-slate-500">
              حذف الطلبات من السيرفر، وتصفير أرباح الشهر الحالي وترحيلها للشهر السابق، أو ضبط المصنع الشامل.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleClearCurrentMonthProfit}
              disabled={clearingProfit}
              className="bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-2"
            >
              {clearingProfit ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              )}

              تصفير أرباح الشهر الحالي (وترحيلها للشهر السابق)
            </button>

            <button
              type="button"
              onClick={handleClearOrdersCounters}
              disabled={clearingOrders}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-2"
            >
              {clearingOrders ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-slate-500" />
              )}

              حذف كافة الطلبات من السيرفر
            </button>

            <button
              type="button"
              onClick={handleFactoryReset}
              disabled={factoryResetting}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-colors cursor-pointer shadow-sm flex items-center gap-2"
            >
              {factoryResetting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}

              ضبط مصنع كامل 
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 mb-4">
            {error}
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full text-lg !py-4 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              جاري الحفظ...
            </>
          ) : saved ? (
            <>
              <Check className="w-5 h-5" />
              تم الحفظ بنجاح
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              حفظ الإعدادات
            </>
          )}
        </button>
      </div>
    </div>
  );
}