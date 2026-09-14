/**
 * setup_local_db.js — Reproducible disposable Supabase DB setup
 *
 * Installs the required functions, triggers, and grants from committed
 * migrations into the local Supabase database. Uses CREATE OR REPLACE
 * and DROP TRIGGER IF EXISTS for idempotent application.
 *
 * Fails immediately if any SQL statement fails (ON_ERROR_STOP).
 *
 * Requirements:
 *   - Docker running with supabase_db_omnis container
 *   - Base schema (tables, RLS policies) already exists from `supabase db reset`
 *   - Run from the omnis project root
 *
 * Usage:
 *   node tests/setup_local_db.js
 *   # Generates tests/setup_local_db.sql then prints the apply command
 *
 *   # Or apply directly:
 *   node tests/setup_local_db.js | docker exec -i supabase_db_omnis psql -U postgres -d postgres
 */

const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

// Required migrations to verify exist AND to apply in full
const REQUIRED = [
  '20260910000000_last_admin_protection.sql',    // safe_remove_admin, check_last_admin_removal
  '20260911000000_harden_email_queue_rls.sql',   // email queue RLS, trg_protect_last_admin
  '20260913000000_fix_audit_trigger.sql',        // fixed trg_pin_audit_source
];

// Migrations to apply in full (not just extract functions)
const APPLY_FULL = [
  '20260911000000_harden_email_queue_rls.sql',
  '20260913000000_fix_audit_trigger.sql',
];

function main() {
  console.error('=== Local DB Setup Generator ===');

  // Verify all required migrations exist
  const missing = [];
  for (const name of REQUIRED) {
    if (!fs.existsSync(path.join(migrationsDir, name))) {
      missing.push(name);
    }
  }
  if (missing.length > 0) {
    console.error('ABORT: Missing required migrations:');
    missing.forEach(m => console.error(`  - ${m}`));
    process.exit(1);
  }
  console.error('All required migrations found.');

  // Build idempotent SQL that extracts only functions/triggers
  const sql = [
    '\\set ON_ERROR_STOP on',
    '',
    `-- Reproducible local DB setup (generated ${new Date().toISOString()})`,
    '-- Applies functions/triggers from committed migrations.',
    '-- Includes RBAC schema from Phase 11 / local_bootstrap.sql.',
    '',
    '-- === Apply full migrations ===',
    '',
  ];

  // Include full migration content for APPLY_FULL migrations
  // Make idempotent: add DROP POLICY IF EXISTS before each CREATE POLICY
  for (const name of APPLY_FULL) {
    let content = fs.readFileSync(path.join(migrationsDir, name), 'utf8');
    // Make CREATE POLICY idempotent by prepending DROP IF EXISTS
    content = content.replace(
      /CREATE POLICY (\w+) ON (\w+)/g,
      'DROP POLICY IF EXISTS $1 ON $2;\nCREATE POLICY $1 ON $2'
    );
    sql.push(`-- === Full migration: ${name} (idempotent) ===`);
    sql.push(content);
    sql.push('');
  }

  sql.push(
    '-- === RBAC schema from Phase 11 / local_bootstrap.sql ===',
    '',
    `CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  status boolean;
BEGIN
  SELECT is_admin INTO status FROM public.user_system_access WHERE user_id = auth.uid();
  RETURN COALESCE(status, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`,
    '',
    '-- Fix: restrict service_role_all to service_role only (supabase db reset creates it for public)',
    'DROP POLICY IF EXISTS service_role_all ON public.user_system_access;',
    'CREATE POLICY service_role_all ON public.user_system_access FOR ALL TO service_role USING (true);',
    '',
    '-- RLS policies for user_system_access',
    `DROP POLICY IF EXISTS "Admins have full access to user_system_access" ON public.user_system_access;`,
    `CREATE POLICY "Admins have full access to user_system_access"
  ON public.user_system_access
  FOR ALL TO authenticated
  USING ( public.is_admin() );`,
    '',
    `DROP POLICY IF EXISTS "Users can read their own access level" ON public.user_system_access;`,
    `CREATE POLICY "Users can read their own access level"
  ON public.user_system_access
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());`,
    '',
    '-- Auto-create access row on new user signup',
    `CREATE OR REPLACE FUNCTION public.handle_new_user_access()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_system_access (user_id, is_admin, systems)
  VALUES (NEW.id, false, '[]'::jsonb);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;`,
    '',
    'DROP TRIGGER IF EXISTS on_auth_user_created_access ON auth.users;',
    `CREATE TRIGGER on_auth_user_created_access
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_access();`,
    '',
    '-- === From 20260910000000_last_admin_protection.sql ===',
    '',
    `CREATE OR REPLACE FUNCTION public.check_last_admin_removal(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE active_admin_count INTEGER;
BEGIN
  PERFORM 1 FROM user_system_access WHERE is_admin = true FOR UPDATE;
  SELECT COUNT(DISTINCT usa.user_id) INTO active_admin_count
  FROM user_system_access usa INNER JOIN auth.users au ON au.id = usa.user_id
  WHERE usa.is_admin = true AND usa.user_id != target_user_id
    AND (au.banned_until IS NULL OR au.banned_until < now());
  RETURN active_admin_count = 0;
END;
$fn$;`,
    '',
    `CREATE OR REPLACE FUNCTION public.safe_remove_admin(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE active_admin_count INTEGER; target_is_admin BOOLEAN;
BEGIN
  PERFORM 1 FROM user_system_access WHERE is_admin = true FOR UPDATE;
  SELECT is_admin INTO target_is_admin FROM user_system_access WHERE user_id = target_user_id;
  IF target_is_admin IS NULL OR target_is_admin = false THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'User is not currently an administrator.');
  END IF;
  SELECT COUNT(DISTINCT usa.user_id) INTO active_admin_count
  FROM user_system_access usa INNER JOIN auth.users au ON au.id = usa.user_id
  WHERE usa.is_admin = true AND usa.user_id != target_user_id
    AND (au.banned_until IS NULL OR au.banned_until < now());
  IF active_admin_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Cannot remove the last active global administrator.');
  END IF;
  UPDATE user_system_access SET is_admin = false WHERE user_id = target_user_id;
  RETURN jsonb_build_object('ok', true, 'reason', '');
END;
$fn$;`,
    '',
    'GRANT EXECUTE ON FUNCTION public.check_last_admin_removal(UUID) TO service_role;',
    'GRANT EXECUTE ON FUNCTION public.safe_remove_admin(UUID) TO service_role;',
    'REVOKE EXECUTE ON FUNCTION public.check_last_admin_removal(UUID) FROM PUBLIC;',
    'REVOKE EXECUTE ON FUNCTION public.safe_remove_admin(UUID) FROM PUBLIC;',
    'REVOKE EXECUTE ON FUNCTION public.check_last_admin_removal(UUID) FROM anon;',
    'REVOKE EXECUTE ON FUNCTION public.check_last_admin_removal(UUID) FROM authenticated;',
    'REVOKE EXECUTE ON FUNCTION public.safe_remove_admin(UUID) FROM anon;',
    'REVOKE EXECUTE ON FUNCTION public.safe_remove_admin(UUID) FROM authenticated;',
    '',
    '-- === From 20260911000000_harden_email_queue_rls.sql (trigger) ===',
    '',
    `CREATE OR REPLACE FUNCTION public.trg_protect_last_admin()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
DECLARE remaining_admins INTEGER; is_removing_admin BOOLEAN := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    is_removing_admin := (OLD.is_admin IS TRUE);
  ELSIF TG_OP = 'UPDATE' THEN
    is_removing_admin := (OLD.is_admin IS TRUE)
      AND ((NEW.is_admin IS DISTINCT FROM TRUE) OR (NEW.user_id IS DISTINCT FROM OLD.user_id));
  END IF;
  IF NOT is_removing_admin THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW;
  END IF;
  PERFORM 1 FROM user_system_access WHERE is_admin = true FOR UPDATE;
  SELECT count(DISTINCT usa.user_id) INTO remaining_admins
  FROM user_system_access usa INNER JOIN auth.users au ON au.id = usa.user_id
  WHERE usa.is_admin = true AND usa.user_id != OLD.user_id
    AND (au.banned_until IS NULL OR au.banned_until < now());
  IF remaining_admins = 0 THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Cannot delete the last active administrator' USING ERRCODE = 'P0001';
    ELSE
      RAISE EXCEPTION 'Cannot remove the last active administrator' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END;
$fn$;`,
    '',
    'DROP TRIGGER IF EXISTS protect_last_admin ON user_system_access;',
    'CREATE TRIGGER protect_last_admin',
    '  BEFORE UPDATE OR DELETE ON user_system_access',
    '  FOR EACH ROW EXECUTE FUNCTION public.trg_protect_last_admin();',
    '',
    '-- === From 20260913000000_fix_audit_trigger.sql ===',
    '',
    `CREATE OR REPLACE FUNCTION public.trg_pin_audit_source()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
BEGIN
  IF current_setting('role', true) IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  NEW.source := 'client';
  RETURN NEW;
END;
$fn$;`,
    '',
    'DROP TRIGGER IF EXISTS pin_audit_source ON omnis_audit_trail;',
    'CREATE TRIGGER pin_audit_source',
    '  BEFORE INSERT ON omnis_audit_trail',
    '  FOR EACH ROW EXECUTE FUNCTION public.trg_pin_audit_source();',
    '',
    '-- === Test-only helper (not for production) ===',
    '',
    `CREATE OR REPLACE FUNCTION public.test_cleanup_all_access()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$
BEGIN
  ALTER TABLE user_system_access DISABLE TRIGGER protect_last_admin;
  TRUNCATE user_system_access;
  ALTER TABLE user_system_access ENABLE TRIGGER protect_last_admin;
END;
$fn$;`,
    'GRANT EXECUTE ON FUNCTION public.test_cleanup_all_access() TO service_role;',
    '',
    '-- === Email schema provisioning (for email-submit tests) ===',
    '',
    `CREATE TABLE IF NOT EXISTS omnis_email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system TEXT,
  to_email TEXT,
  to_name TEXT,
  cc_email TEXT,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  status TEXT DEFAULT 'pending',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  related_doc TEXT,
  related_type TEXT,
  template_id TEXT,
  created_by TEXT,
  created_by_id UUID,
  idempotency_key TEXT,
  payload_hash TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);`,
    'ALTER TABLE omnis_email_queue ENABLE ROW LEVEL SECURITY;',
    `CREATE UNIQUE INDEX IF NOT EXISTS omnis_email_queue_user_idem_key
  ON omnis_email_queue(created_by_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;`,
    '',
    `CREATE TABLE IF NOT EXISTS omnis_email_config (
  system TEXT PRIMARY KEY,
  smtp_host TEXT,
  smtp_port INT DEFAULT 587,
  smtp_user TEXT,
  smtp_pass TEXT,
  from_name TEXT DEFAULT 'Omnis',
  use_tls BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);`,
    'ALTER TABLE omnis_email_config ENABLE ROW LEVEL SECURITY;',
    'GRANT ALL ON omnis_email_queue TO service_role;',
    'GRANT ALL ON omnis_email_config TO service_role;',
    '',
    `INSERT INTO omnis_email_config (system, smtp_host, smtp_port, smtp_user, smtp_pass, from_name, use_tls)
VALUES ('salestrack', '172.18.0.4', 1025, 'test@test.local', 'test', 'Omnis Test', false)
ON CONFLICT (system) DO UPDATE SET smtp_host = EXCLUDED.smtp_host, smtp_port = EXCLUDED.smtp_port, use_tls = EXCLUDED.use_tls;`,
    '',
    '-- === Disposable environment marker (required by test_env_guard.js) ===',
    '',
    'CREATE TABLE IF NOT EXISTS test_env_marker (marker TEXT PRIMARY KEY);',
    "INSERT INTO test_env_marker VALUES ('disposable_test_env') ON CONFLICT DO NOTHING;",
    'GRANT SELECT ON test_env_marker TO service_role;',
    '',
    '-- Disposable audit test marker',
    "INSERT INTO omnis_audit_trail (event_type, source, details)",
    "VALUES ('admin:test_audit', 'admin-operations', '{\"marker\": \"disposable_test_db\"}'::jsonb);",
    '',
    '-- Grants for authenticated role on email tables',
    'GRANT SELECT, INSERT, UPDATE ON omnis_email_queue TO authenticated;',
    'GRANT SELECT ON omnis_email_config TO authenticated;',
    '',
    '-- Add scheduled_for default (worker expects emails without explicit schedule to be due immediately)',
    'ALTER TABLE omnis_email_queue ALTER COLUMN scheduled_for SET DEFAULT now();',
    '',
    '-- Revoke dangerous grants from anon',
    'REVOKE ALL ON user_system_access FROM anon;',
    'REVOKE ALL ON omnis_email_queue FROM anon;',
    '',
    '-- Self-promote protection trigger',
    `CREATE OR REPLACE FUNCTION public.trg_protect_admin_flag()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS \$fn\$
BEGIN
  IF NEW.is_admin IS NOT DISTINCT FROM OLD.is_admin THEN
    RETURN NEW;
  END IF;
  IF current_setting('role', true) IN ('service_role', 'postgres', 'supabase_admin')
     OR current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM user_system_access
    WHERE user_id = auth.uid() AND is_admin = true
  ) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Only administrators can change admin status' USING ERRCODE = 'P0001';
END;
\$fn\$;`,
    '',
    'DROP TRIGGER IF EXISTS protect_admin_flag ON user_system_access;',
    `CREATE TRIGGER protect_admin_flag
  BEFORE UPDATE ON user_system_access
  FOR EACH ROW EXECUTE FUNCTION public.trg_protect_admin_flag();`,
    '',
    '-- Notify PostgREST to reload schema cache (picks up is_admin function)',
    "NOTIFY pgrst, 'reload schema';",
    '',
    "SELECT 'Setup complete' AS status;",
  );

  const outPath = path.join(__dirname, 'setup_local_db.sql');
  fs.writeFileSync(outPath, sql.join('\n'), 'utf8');

  console.error(`Generated: ${outPath}`);
  console.error('Apply with:');
  console.error(`  Get-Content "${outPath}" | docker exec -i supabase_db_omnis psql -U postgres -d postgres`);
}

main();
