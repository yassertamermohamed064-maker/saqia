export type OrderStatus = 'new' | 'in_progress' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  customer_name: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  address_text: string | null;
  tank_size: string | null;
  notes: string | null;
  status: OrderStatus;
  whatsapp_sent: boolean;
  created_at: string;
  customer_id: string | null;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  address_text: string | null;
}

export interface Settings {
  id: number;
  business_name: string;
  logo_url: string | null;
  whatsapp_number: string;
  confirmation_message: string;
  served_cities: string[];
  show_tank_size: boolean;

  // إعدادات ساعات العمل
  show_work_hours?: boolean;
  work_hours_from: string;
  work_hours_to: string;
  work_hours_message?: string | null;

  map_default_lat: number;
  map_default_lng: number;
  updated_at: string;
}

export interface OrderInput {
  customer_name: string;
  phone: string;
  latitude: number | null;
  longitude: number | null;
  address_text: string | null;
  tank_size: string | null;
  notes: string | null;
}

export const TANK_SIZES = [
  '200 لتر',
  '400 لتر',
  '600 لتر',
  '1000 لتر',
  '2000 لتر',
  '5000 لتر',
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'جديد',
  in_progress: 'قيد التنفيذ',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-100 text-rose-700 border-rose-200',
};