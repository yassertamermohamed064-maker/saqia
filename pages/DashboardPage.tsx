import { useEffect, useState } from 'react';
import { LayoutDashboard, ClipboardList, Settings, Droplets, TrendingUp, Clock, CheckCircle2, AlertCircle, ArrowLeft, Calendar, LogOut, Users } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Logo } from '@/components/Logo';
import { useSettings } from '@/hooks/useSettings';
import { useAdminAuth } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';
import { isToday, isThisWeek, isThisMonth, formatSaudiDateShort } from '@/lib/utils';
import { STATUS_LABELS, STATUS_COLORS } from '@/types';
import type { Order, OrderStatus } from '@/types';
import type { Route } from '@/lib/router';

interface DashboardPageProps {
  navigate: (r: Route) => void;
}

export function DashboardPage({ navigate }: DashboardPageProps) {
  const { settings, loading } = useSettings();
  const { admin, logoutAdmin } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !admin) {
      navigate({ name: 'auth', tab: 'admin' });
    }
  }, [loading, admin, navigate]);

  const fetchOrders = () => {
    setFetching(true);
    supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        setFetching(false);
        if (!error && data) {
          // دمج المبالغ المدفوعة المحفوظة محلياً في الذاكرة لتظهر فوراً في الداشبورد
          const enhancedOrders = (data as Order[]).map(o => {
            try {
              const localPaid = localStorage.getItem(`order_paid_${o.id}`);
              if (localPaid !== null) {
                return { ...o, paid_amount: Number(localPaid) || 0 };
              }
            } catch {}
            return o;
          });
          setOrders(enhancedOrders);
        }
      });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  if (loading || !settings || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Droplets className="w-12 h-12 text-blue-500 animate-bounce" />
      </div>
    );
  }

  // جلب الهواتف المحذوفة
  let deletedPhones: string[] = [];
  try {
    const savedDeleted = localStorage.getItem('deleted_customers_phones');
    if (savedDeleted) {
      deletedPhones = JSON.parse(savedDeleted);
    }
  } catch {
    deletedPhones = [];
  }

  // جلب معرفات الطلبات المحذوفة فردياً من صفحة الطلبات (لو وُجدت)
  let deletedOrderIds: string[] = [];
  try {
    const savedDeletedOrders = localStorage.getItem('deleted_orders');
    if (savedDeletedOrders) {
      deletedOrderIds = JSON.parse(savedDeletedOrders);
    }
  } catch {
    deletedOrderIds = [];
  }

  // استبعاد الطلبات المحذوفة
  const validOrders = orders.filter((o) => !deletedPhones.includes(o.phone) && !deletedOrderIds.includes(String(o.id)));

  const factoryResetDate = localStorage.getItem('factory_reset_date');
  const factoryResetTime = factoryResetDate ? new Date(factoryResetDate).getTime() : 0;
  
  const clearOrdersDate = localStorage.getItem('clear_orders_date');
  const clearOrdersTime = clearOrdersDate ? new Date(clearOrdersDate).getTime() : 0;

  const activeResetTime = Math.max(factoryResetTime, clearOrdersTime);
  const activeOrders = validOrders.filter((o) => new Date(o.created_at).getTime() >= activeResetTime);

  const statusCounts = activeOrders.reduce(
    (acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    },
    {} as Record<OrderStatus, number>
  );

  const todayOrders = activeOrders.filter((o) => isToday(o.created_at));
  const weekOrders = activeOrders.filter((o) => isThisWeek(o.created_at));
  const monthOrders = activeOrders.filter((o) => isThisMonth(o.created_at));

  const cycleStartDate = localStorage.getItem('cycle_start_date');
  const cycleStartTime = cycleStartDate ? new Date(cycleStartDate).getTime() : activeResetTime;

  const currentCycleOrders = activeOrders.filter((o) => new Date(o.created_at).getTime() >= cycleStartTime);
  
  const currentMonthProfit = currentCycleOrders.reduce((sum, o) => sum + (Number(o.paid_amount) || 0), 0);

  // ربط أرباح الشهر السابق بالذاكرة أو تصفيرها تماماً عند ضبط المصنع
  const savedLastMonthProfit = localStorage.getItem('last_month_profit');
  const lastMonthProfit = factoryResetDate && !savedLastMonthProfit ? 0 : Number(savedLastMonthProfit ?? 0); 

  const profitDifference = currentMonthProfit - lastMonthProfit;
  const percentageChange = lastMonthProfit > 0 ? ((profitDifference / lastMonthProfit) * 100).toFixed(1) : (currentMonthProfit > 0 ? '100' : '0');

  const avgOrderValue = activeOrders.length > 0 ? (currentMonthProfit / activeOrders.length).toFixed(0) : 0;

  const getChartData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayName = date.toLocaleDateString('ar-SA', { weekday: 'short' });
      const dayOrders = activeOrders.filter(o => new Date(o.created_at).toDateString() === date.toDateString());
      const profit = dayOrders.reduce((sum, o) => sum + (Number(o.paid_amount) || 0), 0);
      data.push({ name: dayName, profit });
    }
    return data;
  };

  const chartData = getChartData();
  const recentOrders = activeOrders.slice(0, 5);

  const stats = [
    { label: 'إجمالي الطلبات', value: activeOrders.length, icon: ClipboardList, color: 'from-blue-500 to-cyan-400' },
    { label: 'طلبات اليوم', value: todayOrders.length, icon: Clock, color: 'from-orange-500 to-amber-400' },
    { label: 'طلبات الأسبوع', value: weekOrders.length, icon: Calendar, color: 'from-violet-500 to-purple-400' },
    { label: 'طلبات الشهر', value: monthOrders.length, icon: TrendingUp, color: 'from-emerald-500 to-teal-400' },
  ];

  const statusCards: { status: OrderStatus; label: string; icon: typeof Clock; color: string }[] = [
    { status: 'new', label: STATUS_LABELS.new, icon: AlertCircle, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { status: 'in_progress', label: STATUS_LABELS.in_progress, icon: Clock, color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { status: 'completed', label: STATUS_LABELS.completed, icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    { status: 'cancelled', label: STATUS_LABELS.cancelled, icon: AlertCircle, color: 'bg-rose-100 text-rose-700 border-rose-200' },
  ];

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <DashboardHeader settings={settings} navigate={navigate} active="dashboard" onLogout={() => { logoutAdmin(); navigate({ name: 'home' }); }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">لوحة التحكم والأرباح</h1>
        <p className="text-slate-500 mb-8">نظرة عامة على الأرباح، الطلبات، ومؤشرات الأداء</p>

        {/* كروت المؤشرات المالية */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-blue-500">
            <p className="text-sm text-slate-500">الأرباح الحالية</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{currentMonthProfit} ر.س</h3>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-amber-500">
            <p className="text-sm text-slate-500">متوسط قيمة الطلب</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{avgOrderValue} ر.س</h3>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-r-4 border-slate-400">
            <p className="text-sm text-slate-500">أرباح الشهر السابق</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{lastMonthProfit} ر.س</h3>
          </div>
          <div className={`bg-white p-6 rounded-xl shadow-sm border-r-4 ${profitDifference >= 0 ? 'border-emerald-500' : 'border-rose-500'}`}>
            <p className="text-sm text-slate-500">معدل النمو</p>
            <h3 className={`text-2xl font-bold mt-1 ${profitDifference >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {profitDifference >= 0 ? `+${percentageChange}%` : `${percentageChange}%`}
            </h3>
          </div>
        </div>

        {/* المخطط البياني */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-6">تحليل الأرباح (آخر 7 أيام)</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="profit" stroke="#3b82f6" fill="#bfdbfe" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* إحصائيات الطلبات */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="card p-5 bg-white rounded-xl shadow-sm">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-lg mb-3`}>
                <s.icon className="w-6 h-6" />
              </div>
              <div className="text-3xl font-extrabold text-slate-900 mb-1">{s.value}</div>
              <div className="text-sm text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statusCards.map((sc) => (
            <button key={sc.status} onClick={() => navigate({ name: 'orders' })} className="card p-4 flex items-center gap-3 bg-white rounded-xl shadow-sm border cursor-pointer hover:border-blue-300 transition-colors">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${sc.color}`}>
                <sc.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-bold text-slate-900">{statusCounts[sc.status] || 0}</div>
                <div className="text-xs text-slate-500">{sc.label}</div>
              </div>
            </button>
          ))}
        </div>

        {/* أحدث الطلبات */}
        <div className="card p-6 bg-white rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-900">أحدث الطلبات</h2>
            <button onClick={() => navigate({ name: 'orders' })} className="text-sm font-semibold text-blue-600 flex items-center gap-1 cursor-pointer">
              عرض الكل <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
          {fetching ? (
            <div className="text-center py-8 text-slate-400">جاري التحميل...</div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">لا توجد طلبات حديثة حالياً</div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">{order.customer_name.charAt(0)}</div>
                    <div>
                      <div className="font-semibold text-slate-900">{order.customer_name}</div>
                      <div className="text-xs text-slate-400">{formatSaudiDateShort(order.created_at)}</div>
                    </div>
                  </div>
                  <span className={`badge ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function DashboardHeader({ settings, navigate, active, onLogout }: any) {
  const navItems = [
    { key: 'dashboard', label: 'الإحصائيات', icon: LayoutDashboard, route: { name: 'dashboard' } },
    { key: 'orders', label: 'الطلبات', icon: ClipboardList, route: { name: 'orders' } },
    { key: 'customers', label: 'العملاء', icon: Users, route: { name: 'customers' } },
    { key: 'settings', label: 'الإعدادات', icon: Settings, route: { name: 'settings' } },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-4">
            <Logo logoUrl={settings.logo_url} businessName={settings.business_name} size="sm" showText={false} />
            <div>
              <div className="font-bold text-slate-900 text-sm">{settings.business_name}</div>
              <div className="text-xs text-slate-400">لوحة التحكم</div>
            </div>
          </div>
          {onLogout && (
            <button onClick={onLogout} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600 cursor-pointer">
              <LogOut className="w-4 h-4" /> خروج
            </button>
          )}
        </div>
        <nav className="flex gap-1 -mb-px">
          {navItems.map((item) => (
            <button key={item.key} onClick={() => navigate(item.route)} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 cursor-pointer ${active === item.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>
              <item.icon className="w-4 h-4" /> {item.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}