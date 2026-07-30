-- Add INSERT policy for authenticated users on omnis_email_queue                                             
DROP POLICY IF EXISTS "allow_authenticated_insert_queue" ON omnis_email_queue;                                                                                                              
DROP POLICY IF EXISTS "allow_authenticated_insert_queue" ON omnis_email_queue;
DROP POLICY IF EXISTS "allow_authenticated_insert_queue" ON omnis_email_queue;
CREATE POLICY "allow_authenticated_insert_queue"
  ON omnis_email_queue 
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
