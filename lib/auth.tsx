import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Customer } from '@/types';

interface AuthContextValue {
  customer: Customer | null;
  loading: boolean;
  loginCustomer: (phone: string, password: string) => Promise<{ error: string | null }>;
  signupCustomer: (
    name: string,
    phone: string,
    password: string,
    latitude: number | null,
    longitude: number | null,
    addressText: string | null
  ) => Promise<{ error: string | null }>;
  logoutCustomer: () => void;
  updateCustomerLocation: (lat: number, lng: number, address: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'miyah_customer';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCustomer(JSON.parse(stored));
      }
    } catch {
      // ignore parse errors
    }
    setLoading(false);
  }, []);

  const loginCustomer = async (phone: string, password: string) => {
    const { data, error } = await supabase.rpc('login_customer', {
      p_phone: phone,
      p_password: password,
    });
    if (error) return { error: 'حدث خطأ أثناء تسجيل الدخول' };
    const result = data as any;
    if (result?.error) {
      if (result.error === 'not_found') return { error: 'لا يوجد حساب بهذا الرقم' };
      if (result.error === 'wrong_password') return { error: 'كلمة المرور غير صحيحة' };
      if (result.error === 'no_password') return { error: 'هذا الحساب لا يدعم تسجيل الدخول بكلمة مرور' };
      return { error: 'فشل تسجيل الدخول' };
    }
    const c: Customer = {
      id: result.id,
      name: result.name,
      phone: result.phone,
      latitude: result.latitude,
      longitude: result.longitude,
      address_text: result.address_text,
    };
    setCustomer(c);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    return { error: null };
  };

  const signupCustomer = async (
    name: string,
    phone: string,
    password: string,
    latitude: number | null,
    longitude: number | null,
    addressText: string | null
  ) => {
    const { data, error } = await supabase.rpc('signup_customer', {
      p_name: name,
      p_phone: phone,
      p_password: password,
      p_latitude: latitude,
      p_longitude: longitude,
      p_address_text: addressText,
    });
    if (error) return { error: 'حدث خطأ أثناء إنشاء الحساب' };
    const result = data as any;
    if (result?.error) {
      if (result.error === 'phone_exists') return { error: 'يوجد حساب بهذا الرقم بالفعل' };
      return { error: 'فشل إنشاء الحساب' };
    }
    const c: Customer = {
      id: result.id,
      name: result.name,
      phone: result.phone,
      latitude: result.latitude,
      longitude: result.longitude,
      address_text: result.address_text,
    };
    setCustomer(c);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    return { error: null };
  };

  const logoutCustomer = () => {
    setCustomer(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const updateCustomerLocation = (lat: number, lng: number, address: string | null) => {
    if (!customer) return;
    const updated = { ...customer, latitude: lat, longitude: lng, address_text: address };
    setCustomer(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    supabase
      .from('customers')
      .update({ latitude: lat, longitude: lng, address_text: address, updated_at: new Date().toISOString() })
      .eq('id', customer.id)
      .then(() => {});
  };

  return (
    <AuthContext.Provider
      value={{ customer, loading, loginCustomer, signupCustomer, logoutCustomer, updateCustomerLocation }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
