
CREATE POLICY "screenshots_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'activity-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "screenshots_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'activity-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "screenshots_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'activity-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
