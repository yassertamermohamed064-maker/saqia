export function formatSaudiDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ar-SA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatSaudiDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ar-SA', {
    timeZone: 'Asia/Riyadh',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function isToday(dateStr: string): boolean {
  const now = new Date();
  const date = new Date(dateStr);
  const riyadhNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  const riyadhDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  return (
    riyadhNow.getFullYear() === riyadhDate.getFullYear() &&
    riyadhNow.getMonth() === riyadhDate.getMonth() &&
    riyadhNow.getDate() === riyadhDate.getDate()
  );
}

export function isThisWeek(dateStr: string): boolean {
  const now = new Date();
  const date = new Date(dateStr);
  const riyadhNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  const riyadhDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  const diffDays = Math.floor(
    (riyadhNow.getTime() - riyadhDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diffDays >= 0 && diffDays <= 7;
}

export function isThisMonth(dateStr: string): boolean {
  const now = new Date();
  const date = new Date(dateStr);
  const riyadhNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  const riyadhDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }));
  return (
    riyadhNow.getFullYear() === riyadhDate.getFullYear() &&
    riyadhNow.getMonth() === riyadhDate.getMonth()
  );
}

// تم تعديل الدالة لتقبل أي رقم بدون قيود
export function normalizeSaudiPhone(phone: string): string {
  if (!phone) return '';
  return phone.trim().replace(/\s|-/g, '');
}

// تم تعديل الدالة لتقبل أي إدخال طالما ليس فارغاً
export function isValidSaudiPhone(phone: string): boolean {
  return phone ? phone.trim().length > 0 : false;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const normalized = normalizeSaudiPhone(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function buildGoogleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function buildGoogleMapsDirections(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizeSaudiPhone(phone);
  return normalized;
}