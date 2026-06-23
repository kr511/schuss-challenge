/* ─── SUPABASE HELPERS ─────────────────────
 *
 * Schmale Wrapper um window.SupabaseAuth / SupabaseClient / SupabaseSession.
 * Werden von Auth-Flow und Profile-System verwendet.
 */

function getSupabaseSessionSafe() {
  try {
    if (window.SupabaseAuth && typeof window.SupabaseAuth.getSession === 'function') {
      return window.SupabaseAuth.getSession() || window.SupabaseSession || null;
    }
  } catch (error) {
    console.warn('[SupabaseSync] Session konnte nicht gelesen werden:', error?.message || error);
  }
  return window.SupabaseSession || null;
}

function getSupabaseUserSafe() {
  const session = getSupabaseSessionSafe();
  return session && session.user ? session.user : null;
}

function getSupabaseClientSafe() {
  if (window.SupabaseClient) return window.SupabaseClient;
  if (window.SupabaseAuth && window.SupabaseAuth.client) return window.SupabaseAuth.client;
  return null;
}

function getSupabaseDisplayName(user) {
  const meta = (user && user.user_metadata) || {};
  return meta.full_name || meta.name || meta.display_name || meta.user_name || (user && user.email ? String(user.email).split('@')[0] : '') || G.username || 'Spieler';
}

function updateSessionFromAuthResult(result) {
  const session = result && result.data && result.data.session ? result.data.session : null;
  if (session) {
    window.SupabaseSession = session;
    window.dispatchEvent(new CustomEvent('supabaseAuthReady', { detail: { session: session } }));
  }
  return session;
}
