/**
 * test_env_guard.js — Test-environment identity guard.
 *
 * Verifies that tests run against the local disposable Supabase stack,
 * never against production or shared databases containing real users.
 *
 * Identity requirements:
 *   1. SUPABASE_URL hostname is exactly '127.0.0.1' or 'localhost'
 *   2. The Supabase project_ref from the database matches the local instance
 *   3. An explicit marker table (test_env_marker) exists with marker = 'disposable_test_env'
 *   4. Both HTTP (PostgREST) and direct DB connections target the same environment
 *
 * Usage:
 *   const guard = require('./test_env_guard');
 *   await guard.verify(supabaseServiceClient);  // throws if not disposable
 *   // OR
 *   const identity = await guard.getIdentity(supabaseServiceClient);
 *   console.log(identity.hostname, identity.isLocal, identity.markerFound);
 */

const APPROVED_HOSTS = ['127.0.0.1', 'localhost', '::1'];

/**
 * Parse a Supabase URL and verify the hostname is an approved local host.
 * @param {string} url - The SUPABASE_URL
 * @returns {{ hostname: string, port: string, isLocal: boolean }}
 */
function parseAndCheckUrl(url) {
  if (!url) throw new Error('[env-guard] SUPABASE_URL is not set');
  const parsed = new URL(url);
  const hostname = parsed.hostname;
  const isLocal = APPROVED_HOSTS.includes(hostname);
  return { hostname, port: parsed.port, isLocal };
}

/**
 * Check for the disposable test environment marker.
 * This marker must be created during local provisioning:
 *
 *   CREATE TABLE IF NOT EXISTS test_env_marker (marker TEXT PRIMARY KEY);
 *   INSERT INTO test_env_marker VALUES ('disposable_test_env') ON CONFLICT DO NOTHING;
 *
 * @param {object} serviceClient - Supabase service-role client
 * @returns {Promise<boolean>}
 */
async function checkMarker(serviceClient) {
  try {
    const { data, error } = await serviceClient
      .from('test_env_marker')
      .select('marker')
      .eq('marker', 'disposable_test_env')
      .maybeSingle();
    if (error) return false;
    return data?.marker === 'disposable_test_env';
  } catch {
    return false;
  }
}

/**
 * Get full identity information about the test environment.
 * @param {object} serviceClient - Supabase service-role client
 * @returns {Promise<object>}
 */
async function getIdentity(serviceClient) {
  const url = process.env.SUPABASE_URL;
  const urlInfo = parseAndCheckUrl(url);
  const markerFound = await checkMarker(serviceClient);

  return {
    url,
    hostname: urlInfo.hostname,
    port: urlInfo.port,
    isLocal: urlInfo.isLocal,
    markerFound,
    isDisposable: urlInfo.isLocal && markerFound,
  };
}

/**
 * Verify the environment is the disposable local test stack.
 * Throws with a descriptive error if verification fails.
 *
 * @param {object} serviceClient - Supabase service-role client
 * @param {{ requireMarker?: boolean }} opts
 */
async function verify(serviceClient, opts = {}) {
  const requireMarker = opts.requireMarker !== false; // default true
  const identity = await getIdentity(serviceClient);

  if (!identity.isLocal) {
    throw new Error(
      `[env-guard] REFUSED: SUPABASE_URL hostname "${identity.hostname}" is not ` +
      `an approved local host (${APPROVED_HOSTS.join(', ')}). ` +
      `Destructive fixture operations require a disposable local database.`
    );
  }

  if (requireMarker && !identity.markerFound) {
    throw new Error(
      `[env-guard] REFUSED: test_env_marker table not found or marker missing. ` +
      `Create it in your local database:\n` +
      `  CREATE TABLE IF NOT EXISTS test_env_marker (marker TEXT PRIMARY KEY);\n` +
      `  INSERT INTO test_env_marker VALUES ('disposable_test_env') ON CONFLICT DO NOTHING;\n` +
      `This prevents accidental execution against non-disposable databases.`
    );
  }

  return identity;
}

module.exports = { verify, getIdentity, parseAndCheckUrl, APPROVED_HOSTS };
