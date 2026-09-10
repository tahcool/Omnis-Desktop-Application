-- Add INSERT policy for authenticated users on omnis_email_queue
DO $wrap$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'omnis_email_queue') THEN
    EXECUTE 'DROP POLICY IF EXISTS "allow_authenticated_insert_queue" ON omnis_email_queue';
    EXECUTE 'CREATE POLICY "allow_authenticated_insert_queue"
      ON omnis_email_queue
      FOR INSERT
      TO authenticated
      WITH CHECK (true)';
  END IF;
END;
$wrap$;
