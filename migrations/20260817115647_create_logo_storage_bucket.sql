/*
# Create logo storage bucket

1. New Storage
- Private bucket `logos` for business logo uploads
- Only authenticated admin users can upload
- Public read access so logos display on the site
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "logos_read_public" ON storage.objects;
CREATE POLICY "logos_read_public" ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "logos_insert_admin" ON storage.objects;
CREATE POLICY "logos_insert_admin" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND (storage.foldername(name))[1] = 'logos'
    AND auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "logos_update_admin" ON storage.objects;
CREATE POLICY "logos_update_admin" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'logos'
    AND auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "logos_delete_admin" ON storage.objects;
CREATE POLICY "logos_delete_admin" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND auth.uid() IN (
      SELECT id FROM auth.users WHERE raw_app_meta_data->>'role' = 'admin'
    )
  );