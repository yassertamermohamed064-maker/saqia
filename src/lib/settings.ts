import { supabase } from './supabase';
import type { Settings } from '@/types';

const DEFAULT_SETTINGS: Settings = {
  id: 1,
  business_name: 'مياه الصفا',
  logo_url: null,
  whatsapp_number: '966500000000',
  confirmation_message:
    'تم استلام طلبك بنجاح! سنتواصل معك قريباً لتأكيد التوصيل.',
  served_cities: [
    'الرياض',
    'جدة',
    'الدمام',
    'مكة المكرمة',
    'المدينة المنورة',
  ],
  show_tank_size: true,
  map_default_lat: 24.7136,
  map_default_lng: 46.6753,
  updated_at: new Date().toISOString(),
};

let cache: Settings | null = null;

export async function getSettings(): Promise<Settings> {
  if (cache) {
    return cache;
  }

  /*
   * مهم جداً:
   * لا نستخدم select('*')
   * حتى لا يتم طلب أي أعمدة إضافية مثل:
   * work_hours_message
   *
   * ساعات العمل يتم حفظها في localStorage
   * وليس في جدول settings.
   */
  const { data, error } = await supabase
    .from('settings')
    .select(
      `
        id,
        business_name,
        logo_url,
        whatsapp_number,
        confirmation_message,
        served_cities,
        show_tank_size,
        map_default_lat,
        map_default_lng,
        updated_at
      `
    )
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) {
    cache = DEFAULT_SETTINGS;
    return cache;
  }

  cache = {
    id: data.id,
    business_name: data.business_name,
    logo_url: data.logo_url ?? null,
    whatsapp_number: data.whatsapp_number,
    confirmation_message: data.confirmation_message,
    served_cities: data.served_cities ?? [],
    show_tank_size: data.show_tank_size ?? true,
    map_default_lat: data.map_default_lat ?? 24.7136,
    map_default_lng: data.map_default_lng ?? 46.6753,
    updated_at: data.updated_at ?? new Date().toISOString(),
  };

  return cache;
}

export function clearSettingsCache() {
  cache = null;
}