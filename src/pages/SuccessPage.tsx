import { useEffect, useState } from 'react';
import { CircleCheck as CheckCircle, Droplets, Chrome as Home, MapPin, Phone, Clock, Loader as Loader2, CircleAlert as AlertCircle, MessageCircle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useSettings } from '@/hooks/useSettings';
import { supabase } from '@/lib/supabase';
import { buildWhatsAppUrl, buildGoogleMapsLink, formatSaudiDate, formatPhoneDisplay } from '@/lib/utils';
import type { Order } from '@/types';
import type { Route } from '@/lib/router';

interface SuccessPageProps {
  orderId: string;
  navigate: (r: Route) => void;
}

export function SuccessPage({ orderId, navigate }: SuccessPageProps) {
  const { settings, loading } = useSettings();
  const [order, setOrder] = useState<Order | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle()
      .then(({ data, error }) => {
        setFetching(false);
        if (!error && data) {
          setOrder(data as Order);
        }
      });
  }, [orderId]);

  if (loading || fetching || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="card p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-900 mb-2">لم يتم العثور على الطلب</h1>
          <p className="text-slate-500 mb-6">قد يكون الرابط غير صحيح أو انتهت صلاحيته.</p>
          <button onClick={() => navigate({ name: 'order' })} className="btn-primary">
            <Home className="w-5 h-5" />
            العودة لصفحة الطلب
          </button>
        </div>
      </div>
    );
  }

  // تجهيز نص رسالة الواتساب للأدمن
  const whatsappMessage = `🔔 طلب مياه جديد من ${settings.business_name}

👤 الاسم: ${order.customer_name}
📱 الجوال: ${formatPhoneDisplay(order.phone)}
📦 حجم التنك: ${order.tank_size || 'غير محدد'}
📍 الموقع: ${order.latitude && order.longitude ? buildGoogleMapsLink(order.latitude, order.longitude) : 'غير محدد'}
${order.address_text ? `🗺️ العنوان: ${order.address_text}` : ''}
${order.notes ? `📝 ملاحظات: ${order.notes}` : ''}
🕐 الوقت: ${formatSaudiDate(order.created_at)}`;

  const adminWhatsAppUrl = buildWhatsAppUrl(settings.whatsapp_number, whatsappMessage);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-center">
          <Logo logoUrl={settings.logo_url} businessName={settings.business_name} size="sm" />
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="max-w-lg w-full">
          {/* Success animation */}
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center mb-6">
              <span className="absolute inline-flex h-24 w-24 rounded-full bg-emerald-400 opacity-20 pulse-ring" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30 animate-scale-in">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">تم استلام طلبك بنجاح!</h1>
            <p className="text-slate-500 leading-relaxed">{settings.confirmation_message}</p>
          </div>

          {/* WhatsApp Direct Action Card */}
          <div className="card p-5 mb-6 bg-emerald-50/60 border-emerald-200 text-center">
            <h3 className="text-base font-bold text-emerald-900 mb-1">إرسال تفاصيل الطلب للإدارة فوراً</h3>
            <p className="text-xs text-emerald-700 mb-4">اضغط على الزر أدناه لإرسال تفاصيل طلبك مباشرة عبر الواتساب إلى المسؤول.</p>
            <a
              href={adminWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp w-full !py-3 inline-flex items-center justify-center gap-2 text-base font-bold shadow-md"
            >
              <MessageCircle className="w-5 h-5" />
              إرسال الطلب عبر الواتساب الآن
            </a>
          </div>

          {/* Order details */}
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">تفاصيل الطلب</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">رقم الطلب</span>
                <span className="text-sm font-mono font-semibold text-slate-900" dir="ltr">
                  #{order.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">الاسم</span>
                <span className="text-sm font-semibold text-slate-900">{order.customer_name}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">رقم الجوال</span>
                <span className="text-sm font-semibold text-slate-900" dir="ltr">{formatPhoneDisplay(order.phone)}</span>
              </div>
              {order.tank_size && (
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">حجم التنك</span>
                  <span className="text-sm font-semibold text-slate-900">{order.tank_size}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-sm text-slate-500">وقت الطلب</span>
                <span className="text-sm font-semibold text-slate-900">{formatSaudiDate(order.created_at)}</span>
              </div>
              {order.address_text && (
                <div className="flex items-start gap-2 py-2">
                  <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span className="text-sm text-slate-600">{order.address_text}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate({ name: 'order' })}
              className="btn-secondary flex-1"
            >
              <Home className="w-5 h-5" />
              العودة لصفحة الطلب
            </button>
            {order.latitude && order.longitude && (
              <a
                href={buildGoogleMapsLink(order.latitude, order.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex-1"
              >
                <MapPin className="w-5 h-5" />
                عرض الموقع
              </a>
            )}
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            سيقوم فريق {settings.business_name} بالتواصل معك قريباً لتأكيد الطلب وتحديد موعد التوصيل.
          </p>
        </div>
      </div>
    </div>
  );
}