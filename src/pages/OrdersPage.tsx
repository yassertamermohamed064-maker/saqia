import React, { useEffect, useState, useCallback } from 'react';
import { Search, MapPin, Phone, ExternalLink, Droplets, Filter, X, MessageCircle, ChevronLeft, Trash2, Plus } from 'lucide-react';
import { DashboardHeader } from '@/pages/DashboardPage';
import { useSettings } from '@/hooks/useSettings';
import { useAdminAuth } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';
import {
  formatSaudiDate,
  buildGoogleMapsLink,
  buildWhatsAppUrl,
  formatPhoneDisplay,
  normalizeSaudiPhone,
} from '@/lib/utils';
import { STATUS_LABELS, STATUS_COLORS } from '@/types';
import type { Order, OrderStatus } from '@/types';
import type { Route } from '@/lib/router';

interface OrdersPageProps {
  navigate: (r: Route) => void;
}

export function OrdersPage({ navigate }: OrdersPageProps) {
  const { settings, loading } = useSettings();
  const { admin, logoutAdmin } = useAdminAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [completionOrder, setCompletionOrder] = useState<Order | null>(null);
  const [completionAmount, setCompletionAmount] = useState('');
  const [savingCompletion, setSavingCompletion] = useState(false);

  const [newOrder, setNewOrder] = useState({
    customer_name: '',
    phone: '',
    tank_size: 'تنك مياه',
    address_text: '',
    status: 'new' as OrderStatus,
    notes: '',
  });

  const [deletedOrderIds, setDeletedOrderIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('deleted_orders_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!loading && !admin) {
      navigate({ name: 'auth', tab: 'admin' });
    }
  }, [loading, admin, navigate]);

  const fetchOrders = useCallback(async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    setFetching(false);
    if (!error && data) {
      // دعم الطلبات القديمة التي كان المبلغ محفوظاً لها محلياً.
      const enhancedOrders = (data as Order[]).map(o => {
        if (o.paid_amount !== null && o.paid_amount !== undefined) return o;
        try {
          const localPaid = localStorage.getItem(`order_paid_${o.id}`);
          if (localPaid !== null) return { ...o, paid_amount: Number(localPaid) || 0 };
        } catch {}
        return o;
      });
      const validOrders = enhancedOrders.filter(o => !deletedOrderIds.includes(o.id));
      setOrders(validOrders);
    }
  }, [deletedOrderIds]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    if (status === 'completed') {
      const target = orders.find((o) => o.id === orderId) || selectedOrder;
      if (target) {
        setCompletionOrder(target);
        setCompletionAmount(
          target.paid_amount !== null && target.paid_amount !== undefined
            ? String(target.paid_amount)
            : ''
        );
      }
      return;
    }

    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status } : null));
      }
    } else {
      console.error('خطأ أثناء تغيير حالة الطلب:', error.message);
      alert('حدث خطأ أثناء تغيير حالة الطلب.');
    }
  };

  const completeOrder = async () => {
    if (!completionOrder) return;

    const amountText = completionAmount.trim();
    if (amountText === '') {
      alert('يرجى إدخال المبلغ الذي تم تحصيله من العميل.');
      return;
    }

    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount < 0) {
      alert('يرجى إدخال مبلغ صحيح.');
      return;
    }

    setSavingCompletion(true);

    // تم تعديل هذا الجزء لإزالة paid_amount من قاعدة البيانات والاعتماد على الـ localStorage فقط
    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', completionOrder.id);

    if (error) {
      console.error('خطأ أثناء إكمال الطلب:', error.message);
      setSavingCompletion(false);
      alert('حدث خطأ أثناء إكمال الطلب: ' + error.message);
      return;
    }

    try {
      localStorage.setItem(`order_paid_${completionOrder.id}`, String(amount));
    } catch {}

    setOrders((prev) => prev.filter((o) => o.id !== completionOrder.id));
    setSelectedOrder(null);
    setCompletionOrder(null);
    setCompletionAmount('');
    setSavingCompletion(false);

    alert('تم تسليم الطلب بنجاح وتسجيل المبلغ وتحديث بيانات العميل.');
  };

  const deleteOrder = async (orderId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) {
        console.error('خطأ أثناء الحذف من قاعدة البيانات:', error.message);
      }

      const updatedDeleted = Array.from(new Set([...deletedOrderIds, orderId]));
      setDeletedOrderIds(updatedDeleted);
      try {
        localStorage.setItem('deleted_orders_ids', JSON.stringify(updatedDeleted));
        localStorage.removeItem(`order_paid_${orderId}`);
      } catch {}
      
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setSelectedOrder(null);
      alert('تم حذف الطلب بنجاح!');
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.customer_name || !newOrder.phone) {
      alert('يرجى إدخال اسم العميل ورقم الجوال على الأقل.');
      return;
    }

    const orderData: any = {
      customer_name: newOrder.customer_name,
      phone: newOrder.phone,
      tank_size: newOrder.tank_size,
      address_text: newOrder.address_text,
      status: newOrder.status,
      notes: newOrder.notes,
      whatsapp_sent: false,
    };

    const { data, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select();

    if (error) {
      alert('حدث خطأ أثناء إضافة الطلب: ' + error.message);
    } else if (data && data[0]) {
      alert('تم إضافة الطلب بنجاح وتحديث السجلات!');
      setIsAddModalOpen(false);
      setNewOrder({
        customer_name: '',
        phone: '',
        tank_size: 'تنك مياه',
        address_text: '',
        status: 'new',
        notes: '',
      });
      fetchOrders();
    }
  };

  const filtered = orders.filter((o) => {
    if (o.status === 'completed') return false;

    const matchesSearch =
      !search ||
      o.customer_name.includes(search) ||
      o.phone.includes(search) ||
      (o.address_text?.includes(search) ?? false);
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading || !settings || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Droplets className="w-12 h-12 text-blue-500 animate-bounce" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardHeader settings={settings} navigate={navigate} active="orders" onLogout={() => { logoutAdmin(); navigate({ name: 'home' }); }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">الطلبات</h1>
            <p className="text-slate-500">إدارة وتتبع جميع الطلبات المرتبطة بالعملاء والمبالغ المدفوعة</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            إضافة طلب يدوي
          </button>
        </div>

        {/* Search & Filter */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو الجوال أو العنوان..."
                className="input-field pr-12"
              />
            </div>
            <div className="relative">
              <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
                className="input-field pr-12 appearance-none cursor-pointer min-w-[160px]"
              >
                <option value="all">جميع الحالات</option>
                <option value="new">{STATUS_LABELS.new}</option>
                <option value="in_progress">{STATUS_LABELS.in_progress}</option>
                <option value="completed">{STATUS_LABELS.completed}</option>
                <option value="cancelled">{STATUS_LABELS.cancelled}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {fetching ? (
          <div className="text-center py-16 text-slate-400">
            <Droplets className="w-10 h-10 mx-auto mb-3 animate-pulse" />
            جاري تحميل الطلبات...
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-300" />
            </div>
            <p className="font-semibold text-slate-600 mb-1">لا توجد طلبات مطابقة</p>
            <p className="text-sm text-slate-400">جرّب إضافة طلب جديد يدوياً أو تغيير معايير البحث</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((order) => (
              <div
                key={order.id}
                className="card p-5 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold shadow-md">
                      {order.customer_name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{order.customer_name}</div>
                      <div className="text-xs text-slate-400" dir="ltr">{formatPhoneDisplay(order.phone)}</div>
                    </div>
                  </div>
                  <span className={`badge ${STATUS_COLORS[order.status]}`}>{STATUS_LABELS[order.status]}</span>
                </div>

                <div className="space-y-1.5 text-sm mb-3">
                  {order.tank_size && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Droplets className="w-4 h-4 text-blue-400" />
                      <span>{order.tank_size}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="text-xs">{formatSaudiDate(order.created_at)}</span>
                  </div>
                  {order.address_text && (
                    <div className="flex items-start gap-2 text-slate-500">
                      <MapPin className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                      <span className="text-xs line-clamp-1">{order.address_text}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                  <a
                    href={`tel:${normalizeSaudiPhone(order.phone)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 min-w-[70px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    اتصال
                  </a>
                  {order.latitude && order.longitude && (
                    <a
                      href={buildGoogleMapsLink(order.latitude, order.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 min-w-[70px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      الموقع
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrder(order);
                    }}
                    className="flex-1 min-w-[70px] inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    تفاصيل
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteOrder(order.id);
                    }}
                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-rose-50 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors"
                    title="حذف الطلب"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* نافذة إضافة طلب يدوي */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-slate-900">إضافة طلب جديد يدوياً</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">اسم العميل *</label>
                <input
                  type="text"
                  required
                  value={newOrder.customer_name}
                  onChange={(e) => setNewOrder({ ...newOrder, customer_name: e.target.value })}
                  placeholder="مثال: أحمد محمد"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">رقم الجوال *</label>
                <input
                  type="text"
                  required
                  dir="ltr"
                  value={newOrder.phone}
                  onChange={(e) => setNewOrder({ ...newOrder, phone: e.target.value })}
                  placeholder="05xxxxxxxx"
                  className="input-field text-right"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">حجم التنك / الخدمة</label>
                <input
                  type="text"
                  value={newOrder.tank_size}
                  onChange={(e) => setNewOrder({ ...newOrder, tank_size: e.target.value })}
                  placeholder="مثال: تنك كبير / 1000 لتر"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">العنوان</label>
                <input
                  type="text"
                  value={newOrder.address_text}
                  onChange={(e) => setNewOrder({ ...newOrder, address_text: e.target.value })}
                  placeholder="المدينة، الحي، الشارع"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">حالة الطلب</label>
                <select
                  value={newOrder.status}
                  onChange={(e) => setNewOrder({ ...newOrder, status: e.target.value as OrderStatus })}
                  className="input-field"
                >
                  <option value="new">{STATUS_LABELS.new}</option>
                  <option value="in_progress">{STATUS_LABELS.in_progress}</option>
                   <option value="cancelled">{STATUS_LABELS.cancelled}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ملاحظات</label>
                <textarea
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                  placeholder="أي تفاصيل إضافية عن الطلب..."
                  className="input-field min-h-[80px]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-sm"
                >
                  حفظ وإضافة الطلب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* نافذة إكمال الطلب وإدخال المبلغ المحصل */}
      {completionOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" dir="rtl">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !savingCompletion && setCompletionOrder(null)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <Droplets className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">تم تسليم الطلب بنجاح 🎉</h2>
                <p className="text-sm text-slate-500 mt-1">{completionOrder.customer_name}</p>
              </div>
            </div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              أدخل المبلغ الذي تم تحصيله من العميل
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={completionAmount}
              onChange={(e) => setCompletionAmount(e.target.value)}
              placeholder="مثال: 500"
              autoFocus
              disabled={savingCompletion}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-lg font-bold text-emerald-600 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-5"
              onKeyDown={(e) => {
                if (e.key === 'Enter') completeOrder();
              }}
            />
            <div className="flex gap-3">
              <button
                type="button"
                disabled={savingCompletion}
                onClick={() => setCompletionOrder(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-semibold py-2.5 rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={savingCompletion}
                onClick={completeOrder}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors shadow-sm"
              >
                {savingCompletion ? 'جاري الحفظ...' : 'حفظ وإكمال'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Drawer */}
      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={updateStatus}
          onDelete={deleteOrder}
        />
      )}
    </div>
  );
}

function OrderDetailDrawer({
  order,
  onClose,
  onStatusChange,
  onDelete,
}: {
  order: Order;
  onClose: () => void;
  onStatusChange: (id: string, status: OrderStatus) => void;
  onDelete: (id: string) => void;
}) {
  const statusOptions: OrderStatus[] = ['new', 'in_progress', 'completed', 'cancelled'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative w-full max-w-md max-h-[calc(100dvh-2rem)] bg-white rounded-2xl shadow-2xl overflow-y-auto animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-slate-900">تفاصيل الطلب</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {order.customer_name.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-slate-900 text-lg">{order.customer_name}</div>
              <div className="text-sm text-slate-500" dir="ltr">{formatPhoneDisplay(order.phone)}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2">الحالة الحالية</div>
            <span className={`badge ${STATUS_COLORS[order.status]} !text-sm`}>{STATUS_LABELS[order.status]}</span>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <span className="text-sm text-slate-500">رقم الطلب</span>
              <span className="text-sm font-mono font-semibold text-slate-900" dir="ltr">
                #{order.id.slice(0, 8).toUpperCase()}
              </span>
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
          </div>

          {order.address_text && (
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-500 mb-1">العنوان</div>
              <div className="text-sm text-slate-700">{order.address_text}</div>
            </div>
          )}

          {order.notes && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
              <div className="text-xs font-semibold text-amber-700 mb-1">ملاحظات العميل</div>
              <div className="text-sm text-slate-700">{order.notes}</div>
            </div>
          )}

          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2">تغيير الحالة</div>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => onStatusChange(order.id, s)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${
                    order.status === s
                      ? STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-current'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <a
              href={`tel:${normalizeSaudiPhone(order.phone)}`}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <Phone className="w-4 h-4" />
              اتصال
            </a>
            <a
              href={buildWhatsAppUrl(order.phone, `السلام عليكم ${order.customer_name}، بخصوص طلب المياه...`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1eb856] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              واتساب
            </a>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => onDelete(order.id)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-100 border border-rose-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              حذف الطلب نهائياً
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}