import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { supabase } from './supabase';

interface AdminSession {
  email: string;
}

interface AdminAuthContextValue {
  admin: AdminSession | null;
  loading: boolean;
  loginAdmin: (email: string, password: string) => Promise<{ error: string | null }>;
  signupAdmin: (email: string, password: string, setupCode: string) => Promise<{ error: string | null }>;
  logoutAdmin: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'miyah_admin';

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setAdmin(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const loginAdmin = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' };
    if (!data.user || data.user.user_metadata?.role !== 'admin') {
      await supabase.auth.signOut();
      return { error: 'هذا الحساب ليس لديه صلاحيات الأدمن' };
    }
    const session: AdminSession = { email: data.user.email || email };
    setAdmin(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return { error: null };
  };

  const signupAdmin = async (email: string, password: string, setupCode: string) => {
    const { data, error } = await supabase.rpc('create_admin', {
      p_email: email,
      p_password: password,
      p_setup_code: setupCode,
    });
    if (error) return { error: 'حدث خطأ أثناء إنشاء حساب الأدمن' };
    const result = data as any;
    if (result?.error) {
      if (result.error === 'invalid_setup_code') return { error: 'رمز الإعداد غير صحيح' };
      if (result.error === 'admin_exists') return { error: 'يوجد حساب أدمن بالفعل' };
      if (result.error === 'email_used') return { error: 'هذا البريد الإلكتروني مستخدم بالفعل' };
      return { error: 'فشل إنشاء الحساب' };
    }
    // Auto-login the new admin
    const loginResult = await loginAdmin(email, password);
    return loginResult;
  };

  const logoutAdmin = () => {
    setAdmin(null);
    localStorage.removeItem(STORAGE_KEY);
    supabase.auth.signOut().then(() => {});
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, loginAdmin, signupAdmin, logoutAdmin }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
