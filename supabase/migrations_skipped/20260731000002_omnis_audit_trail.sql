-- Omnis System Audit Trail
-- Stores all significant actions with timestamps for accountability and compliance.

CREATE TABLE IF NOT EXISTS omnis_audit_trail (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  TEXT        NOT NULL,
  entity_type TEXT,
  entity_name TEXT,
  user_email  TEXT,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_event_type  ON omnis_audit_trail (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_entity_name ON omnis_audit_trail (entity_name);
CREATE INDEX IF NOT EXISTS idx_audit_user_email  ON omnis_audit_trail (user_email);
CREATE INDEX IF NOT EXISTS idx_audit_created_at  ON omnis_audit_trail (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_fts ON omnis_audit_trail
  USING gin(to_tsvector('english',
    coalesce(event_type,'') || ' ' ||
    coalesce(entity_type,'') || ' ' ||
    coalesce(entity_name,'') || ' ' ||
    coalesce(user_email,'')
  ));

ALTER TABLE omnis_audit_trail ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow select" ON omnis_audit_trail FOR SELECT USING (true);
CREATE POLICY "Allow insert" ON omnis_audit_trail FOR INSERT WITH CHECK (true);
