-- إضافة جميع الأعمدة الخاصة بساعات العمل وإعداداتها لجدول settings
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS show_work_hours BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS work_hours_message TEXT,
ADD COLUMN IF NOT EXISTS work_hours_from TEXT DEFAULT '8:00 صباحاً',
ADD COLUMN IF NOT EXISTS work_hours_to TEXT DEFAULT '10:00 مساءً';

-- التأكد من وجود قيم افتراضية للسجل الحالي
UPDATE public.settings
SET
  work_hours_from = COALESCE(work_hours_from, '8:00 صباحاً'),
  work_hours_to = COALESCE(work_hours_to, '10:00 مساءً')
WHERE id = 1;

-- تحديث schema cache
NOTIFY pgrst, 'reload schema';