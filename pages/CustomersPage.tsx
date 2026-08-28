import { useState, useEffect } from 'react';
import { Users, Trash2, Ban, CheckCircle, Search, Droplets, Phone, MapPin } from 'lucide-react';
import { DashboardHeader } from './DashboardPage';
import { useSettings } from '@/hooks/useSettings';
import { useAdminAuth } from '@/lib/adminAuth';
import { supabase } from '@/lib/supabase';
import type { Route } from '@/lib/router';

interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  status: 'active' | 'suspended';
}

interface CustomersPageProps {
  navigate: (r: Route) => void;
}

const normalizePhone = (phone: string) => {
  if (!phone) return '';
  let cleaned = phone.trim().replace(/\s+/g, '');
  if (cleaned.startsWith('+966')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('966')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('20') && cleaned.length > 10) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
};

export function CustomersPage({ navigate }: CustomersPageProps) {
  const { settings, loading } = useSettings();
  const { admin, logoutAdmin } = useAdminAuth();
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [fetching, setFetching] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!loading && !admin) {
      navigate({ name: 'auth', tab: 'admin' });
    }
  }, [loading, admin, navigate]);

  const fetchCustomers = async () => {
    setFetching(true);
    
    const { data: customersData, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*'); // جلب جميع أعمدة الطلبات لضمان عدم تفويت أي حقل

    let deletedPhones: string[] = [];
    try {
      const savedDeleted = localStorage.getItem('deleted_customers_phones');
      if (savedDeleted) deletedPhones = JSON.parse(savedDeleted);
    } catch {}

    let deletedOrderIds: string[] = [];
    try {
      const keysToCheck = ['deleted_orders_ids', 'deleted_orders', 'deleted_order_ids'];
      keysToCheck.forEach(key => {
        const val = localStorage.getItem(key);
        if (val) {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed)) {
            deletedOrderIds = [...deletedOrderIds, ...parsed.map(String)];
          }
        }
      });
    } catch {}

    const savedStatuses = JSON.parse(localStorage.getItem('customer_statuses') || '{}');

    if (!customersError && customersData) {
      const formattedCustomers: Customer[] = customersData.map((cust) => {
        const normalizedCustPhone = normalizePhone(cust.phone);

        const custOrders = ordersData?.filter(o => {
          // فحص مرن لرقم الهاتف (سواء في حقل phone أو customer_phone)
          const orderPhoneRaw = o.phone || o.customer_phone || '';
          const normalizedOrderPhone = normalizePhone(orderPhoneRaw);
          
          const isMatchPhone = normalizedOrderPhone && normalizedCustPhone && normalizedOrderPhone === normalizedCustPhone;
          
          // فحص الاسم بطريقة مرنة (تجاهل المسافات الزائدة)
          const orderName = (o.customer_name || '').trim().toLowerCase();
          const custName = (cust.name || '').trim().toLowerCase();
          const isMatchName = orderName && custName && orderName === custName;
          
          const isNotDeletedPhone = !deletedPhones.includes(cust.phone) && !deletedPhones.includes(normalizedCustPhone);
          const isNotDeletedOrder = !deletedOrderIds.includes(String(o.id));
          
          // نعتبر الطلب محسوباً إذا كان مكتمل أو مضافاً وله مبلغ مسجل في الـ localStorage حتى لو تغيرت حالته أو لم يتم تحديثها بعد
          const hasLocalPaid = (() => {
            try {
              return localStorage.getItem(`order_paid_${o.id}`) !== null;
            } catch {
              return false;
            }
          })();

          const isCompleted = o.status === 'completed' || hasLocalPaid;

          return (isMatchPhone || isMatchName) &&
            isNotDeletedPhone &&
            isNotDeletedOrder &&
            isCompleted;
        }) || [];

        const totalOrders = custOrders.length;
        const calculatedSpent = custOrders.reduce((sum, o) => {
          // فحص المبلغ من الـ localStorage أولاً لأنه الأحدث بناءً على تسجيل الإيصال الأخير
          try {
            const localPaid = localStorage.getItem(`order_paid_${o.id}`);
            if (localPaid !== null) {
              return sum + (Number(localPaid) || 0);
            }
          } catch {}

          const dbPaid = Number(o.paid_amount || o.total_price || 0);
          if (Number.isFinite(dbPaid) && dbPaid >= 0) return sum + dbPaid;

          return sum;
        }, 0);

        return {
          id: cust.id,
          name: cust.name || 'عميل بدون اسم',
          phone: cust.phone || '',
          address: cust.address_text || cust.address || 'العنوان غير متوفر',
          totalOrders: totalOrders,
          totalSpent: calculatedSpent,
          status: savedStatuses[cust.id] || 'active',
        };
      });

      setCustomers(formattedCustomers);
    }
    setFetching(false);
  };

  useEffect(() => {
    fetchCustomers();

    const handleStorageChange = (e?: StorageEvent) => {
      if (!e || e.key?.includes('deleted_orders') || e.key?.includes('customer') || e.key?.includes('order_paid')) {
        fetchCustomers();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleStorageChange);
    };
  }, []);

  if (loading || !settings || !admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Droplets className="w-12 h-12 text-blue-500 animate-bounce" />
      </div>
    );
  }

  const toggleStatus = (id: string, currentStatus: 'active' | 'suspended') => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setCustomers(prev => prev.map(c => (c.id === id ? { ...c, status: newStatus } : c)));

    const savedStatuses = JSON.parse(localStorage.getItem('customer_statuses') || '{}');
    savedStatuses[id] = newStatus;
    localStorage.setItem('customer_statuses', JSON.stringify(savedStatuses));
  };

  const deleteCustomer = async (phone: string, name: string, id: string) => {
    if (window.confirm(`هل أنت متأكد من حذف العميل (${name}) نهائياً؟`)) {
      try {
        await supabase.rpc('delete_customer_orders', { phone_number: phone });
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;

        setCustomers(prev => prev.filter(c => c.id !== id));
        alert('تم حذف العميل بنجاح!');
      } catch (err) {
        console.error(err);
        alert('حدث خطأ أثناء محاولة الحذف');
      }
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm) ||
    c.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <DashboardHeader 
        settings={settings} 
        navigate={navigate} 
        active="customers" 
        onLogout={() => { logoutAdmin(); navigate({ name: 'home' }); }} 
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">إدارة العملاء</h1>
            <p className="text-sm text-slate-500 mt-1">عرض وتتبع العملاء، وتحديد إجمالي المدفوعات بالريال السعودي</p>
          </div>
          
          <div className="relative w-full sm:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="بحث بالاسم، الهاتف، أو العنوان..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                  <th className="p-4 font-semibold">اسم العميل</th>
                  <th className="p-4 font-semibold">رقم الهاتف</th>
                  <th className="p-4 font-semibold">العنوان</th>
                  <th className="p-4 font-semibold">عدد الطلبات</th>
                  <th className="p-4 font-semibold">إجمالي المدفوعات (ر.س)</th>
                  <th className="p-4 font-semibold">الحالة</th>
                  <th className="p-4 font-semibold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {fetching ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <Droplets className="w-8 h-8 mx-auto mb-2 animate-pulse text-blue-500" />
                      جاري تحميل بيانات العملاء...
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-slate-400">
                      <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      لا توجد بيانات عملاء مسجلة في القاعدة حتى الآن
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-4 font-semibold text-slate-900">{customer.name}</td>
                      <td className="p-4 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-blue-500" />
                          {customer.phone}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">
                        <span className="inline-flex items-center gap-1 max-w-xs truncate">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span className="truncate">{customer.address}</span>
                        </span>
                      </td>
                      <td className="p-4 text-slate-700 font-medium">{customer.totalOrders} طلب</td>
                       <td className="p-4">
                         <span className="text-emerald-600 font-bold">{customer.totalSpent} ر.س</span>
                       </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          customer.status === 'active' 
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                            : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}>
                          {customer.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                          {customer.status === 'active' ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            type="button"
                            onClick={() => toggleStatus(customer.id, customer.status)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                              customer.status === 'active' 
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' 
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            <Ban className="w-3 h-3" />
                            {customer.status === 'active' ? 'إيقاف' : 'تفعيل'}
                          </button>
                          <button 
                            type="button"
                            onClick={() => deleteCustomer(customer.phone, customer.name, customer.id)}
                            className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold hover:bg-rose-100 border border-rose-200 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}