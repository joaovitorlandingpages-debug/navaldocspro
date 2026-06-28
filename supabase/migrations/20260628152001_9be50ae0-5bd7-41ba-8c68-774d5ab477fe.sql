
CREATE POLICY "anon write signed-documents"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'signed-documents');

CREATE POLICY "anon update signed-documents"
ON storage.objects FOR UPDATE
TO anon
USING (bucket_id = 'signed-documents')
WITH CHECK (bucket_id = 'signed-documents');
