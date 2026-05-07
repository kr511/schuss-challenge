/* ─── AUTH UI ───────────────────────────────
 *
 * Supabase-Auth-Flows (Google OAuth + E-Mail/Passwort) und
 * zugehörige UI-Updates. Abhängigkeiten: supabase-helpers.js,
 * StorageManager, G (app.js), sanitizeUsername/syncProfileWithBackend (app.js).
 */

window.signInWithGoogle = async function() {
  if (typeof window.__agGoogle === 'function') return window.__agGoogle();
  if (window.SupabaseAuth && typeof window.SupabaseAuth.signInWithGoogle === 'function') return window.SupabaseAuth.signInWithGoogle();
  alert('Supabase Login ist noch nicht bereit. Bitte lade die Seite neu oder spiele lokal weiter.');
};

window.signOutGoogle = async function() {
  return window.logoutEmail();
};

window.registerWithEmail = async function(email, password) {
  const client = getSupabaseClientSafe();
  if (!client || !client.auth || typeof client.auth.signUp !== 'function') throw new Error('Supabase Auth ist noch nicht bereit.');
  if (!email || !password) throw new Error('Bitte E-Mail und Passwort ausfuellen.');
  if (password.length < 6) throw new Error('Passwort muss mindestens 6 Zeichen haben.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Bitte eine gueltige E-Mail-Adresse eingeben.');
  try {
    const result = await client.auth.signUp({ email: email, password: password, options: { data: { display_name: G.username || email.split('@')[0] } } });
    if (result.error) throw result.error;
    const session = updateSessionFromAuthResult(result);
    const user = result.data && result.data.user ? result.data.user : (session && session.user ? session.user : null);
    if (user && !G.username) {
      G.username = sanitizeUsername(getSupabaseDisplayName(user));
      StorageManager.setRaw('username', G.username);
    }
    syncProfileWithBackend(null, { reason: 'register' });
    updateAuthUI(user);
    updateAccountSyncStatus();
    return user;
  } catch (error) {
    console.error('[SupabaseSync] Registrierung fehlgeschlagen:', error);
    throw new Error(error?.message || 'Registrierung fehlgeschlagen.');
  }
};

window.signInWithEmail = async function(email, password) {
  const client = getSupabaseClientSafe();
  if (!client || !client.auth || typeof client.auth.signInWithPassword !== 'function') throw new Error('Supabase Auth ist noch nicht bereit.');
  if (!email || !password) throw new Error('Bitte E-Mail und Passwort ausfuellen.');
  try {
    const result = await client.auth.signInWithPassword({ email: email, password: password });
    if (result.error) throw result.error;
    const session = updateSessionFromAuthResult(result);
    const user = session && session.user ? session.user : null;
    const displayName = sanitizeUsername(getSupabaseDisplayName(user));
    if (displayName && (!G.username || G.username === 'Schuetze')) {
      G.username = displayName;
      StorageManager.setRaw('username', G.username);
    }
    syncProfileWithBackend(null, { reason: 'login' });
    updateAuthUI(user);
    updateAccountSyncStatus();
    return user;
  } catch (error) {
    console.error('[SupabaseSync] Anmeldung fehlgeschlagen:', error);
    throw new Error(error?.message || 'Anmeldung fehlgeschlagen.');
  }
};

window.logoutEmail = async function() {
  if (!confirm('Moechtest du dich wirklich abmelden? Deine lokalen Daten bleiben auf diesem Geraet erhalten.')) return false;
  try {
    const localData = { username: G.username, xp: G.xp, streak: G.streak, weapon: G.weapon, discipline: G.discipline };
    StorageManager.setRaw('pre_logout_data', JSON.stringify(localData));
    const client = getSupabaseClientSafe();
    if (client && client.auth && typeof client.auth.signOut === 'function') await client.auth.signOut();
    else if (window.SupabaseAuth && typeof window.SupabaseAuth.signOut === 'function') await window.SupabaseAuth.signOut();
    window.SupabaseSession = null;
    updateAuthUI(null);
    updateAccountSyncStatus();
    updateXPCorner();
    updateProfileMenu();
    console.log('[SupabaseSync] Abgemeldet');
    return true;
  } catch (error) {
    console.error('[SupabaseSync] Logout fehlgeschlagen:', error);
    throw new Error('Abmeldung fehlgeschlagen: ' + (error?.message || error));
  }
};

function updateAuthUI(user = getSupabaseUserSafe()) {
  updateGoogleLoginUI(user);
  const emailAuthContainer = document.getElementById('emailAuthContainer');
  const authFormContainer = document.getElementById('authFormContainer');
  const authenticated = !!user && window.SchussduellLocalMode !== true && window.SchussduellLocalPlay !== true;
  if (emailAuthContainer && authFormContainer) {
    if (authenticated) {
      emailAuthContainer.style.display = 'block';
      authFormContainer.style.display = 'none';
      const displayName = getSupabaseDisplayName(user);
      const avatar = document.getElementById('authUserAvatar');
      const name = document.getElementById('authUserName');
      const emailNode = document.getElementById('authUserEmail');
      if (avatar) avatar.textContent = (displayName || 'S').charAt(0).toUpperCase();
      if (name) name.textContent = displayName || 'Supabase Nutzer';
      if (emailNode) emailNode.textContent = user.email || '';
    } else {
      emailAuthContainer.style.display = 'none';
      authFormContainer.style.display = 'block';
    }
  }
  const profileIcon = document.getElementById('profileIcon');
  if (profileIcon) {
    profileIcon.style.visibility = authenticated || G.username ? 'visible' : 'hidden';
    profileIcon.style.background = authenticated ? 'linear-gradient(135deg, #00c3ff 0%, #7ab030 100%)' : '';
    profileIcon.style.color = authenticated ? '#000' : '';
  }
  if (typeof updatePDGreeting === 'function') setTimeout(updatePDGreeting, 200);
}

window.switchAuthTab = function(tab) {
  const loginTab = document.getElementById('authTabLogin');
  const registerTab = document.getElementById('authTabRegister');
  const loginForm = document.getElementById('authLoginForm');
  const registerForm = document.getElementById('authRegisterForm');
  if (!loginTab || !registerTab || !loginForm || !registerForm) return;
  hideAuthMessage();
  const isLogin = tab === 'login';
  loginTab.style.background = isLogin ? 'linear-gradient(135deg,#00c3ff 0%,#7ab030 100%)' : 'transparent';
  loginTab.style.color = isLogin ? '#000' : 'rgba(255,255,255,0.5)';
  registerTab.style.background = !isLogin ? 'linear-gradient(135deg,#00c3ff 0%,#7ab030 100%)' : 'transparent';
  registerTab.style.color = !isLogin ? '#000' : 'rgba(255,255,255,0.5)';
  loginForm.style.display = isLogin ? 'flex' : 'none';
  registerForm.style.display = isLogin ? 'none' : 'flex';
};

window.showAuthMessage = function(text, type = 'error') {
  const msg = document.getElementById('authMessage');
  if (!msg) return;
  msg.textContent = text;
  msg.style.display = 'block';
  msg.style.background = type === 'error' ? 'rgba(240,96,80,0.15)' : 'rgba(122,176,48,0.15)';
  msg.style.border = type === 'error' ? '1px solid rgba(240,96,80,0.3)' : '1px solid rgba(122,176,48,0.3)';
  msg.style.color = type === 'error' ? '#f06050' : '#7ab030';
};

window.hideAuthMessage = function() { const msg = document.getElementById('authMessage'); if (msg) msg.style.display = 'none'; };

window.setAuthLoading = function(loading, btnId = 'authLoginBtn') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = !!loading;
  if (loading) btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid rgba(0,0,0,0.2);border-top-color:#000;border-radius:50%;animation:spin 0.6s linear infinite;"></span> Wird verarbeitet...';
  else btn.textContent = btnId === 'authLoginBtn' ? 'Anmelden' : 'Konto erstellen';
};

window.handleAuthLogin = async function() {
  const email = document.getElementById('authLoginEmail')?.value.trim() || '';
  const password = document.getElementById('authLoginPassword')?.value || '';
  hideAuthMessage();
  if (!email || !password) return showAuthMessage('Bitte E-Mail und Passwort ausfuellen.');
  setAuthLoading(true, 'authLoginBtn');
  try {
    await signInWithEmail(email, password);
    showAuthMessage('Erfolgreich angemeldet!', 'success');
    const emailInput = document.getElementById('authLoginEmail');
    const passwordInput = document.getElementById('authLoginPassword');
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    setTimeout(() => hideAuthMessage(), 2000);
  } catch (error) { showAuthMessage(error.message); }
  finally { setAuthLoading(false, 'authLoginBtn'); }
};

window.handleAuthRegister = async function() {
  const email = document.getElementById('authRegisterEmail')?.value.trim() || '';
  const password = document.getElementById('authRegisterPassword')?.value || '';
  const passwordConfirm = document.getElementById('authRegisterPasswordConfirm')?.value || '';
  hideAuthMessage();
  if (!email || !password || !passwordConfirm) return showAuthMessage('Bitte alle Felder ausfuellen.');
  if (password !== passwordConfirm) return showAuthMessage('Passwoerter stimmen nicht ueberein.');
  setAuthLoading(true, 'authRegisterBtn');
  try {
    await registerWithEmail(email, password);
    showAuthMessage('Konto erstellt. Deine Daten werden synchronisiert.', 'success');
    ['authRegisterEmail', 'authRegisterPassword', 'authRegisterPasswordConfirm'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    setTimeout(() => hideAuthMessage(), 2000);
  } catch (error) { showAuthMessage(error.message); }
  finally { setAuthLoading(false, 'authRegisterBtn'); }
};

function initAuthFormListeners() {
  const loginPassword = document.getElementById('authLoginPassword');
  const registerPasswordConfirm = document.getElementById('authRegisterPasswordConfirm');
  if (loginPassword) loginPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAuthLogin(); });
  if (registerPasswordConfirm) registerPasswordConfirm.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAuthRegister(); });
}

function injectAuthSpinnerCSS() {
  if (document.getElementById('auth-spinner-style')) return;
  const style = document.createElement('style');
  style.id = 'auth-spinner-style';
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}

function updateGoogleLoginUI(user = getSupabaseUserSafe()) {
  const loginBtn = document.getElementById('googleLoginBtn');
  const logoutBtn = document.getElementById('googleLogoutBtn');
  const loginInfo = document.getElementById('googleLoginInfo');
  const userName = document.getElementById('googleUserName');
  const userEmail = document.getElementById('googleUserEmail');
  const avatar = document.getElementById('googleAvatar');
  const provider = user && (user.app_metadata?.provider || (Array.isArray(user.identities) && user.identities[0]?.provider));
  const isGoogleUser = !!user && provider === 'google';
  if (!isGoogleUser) {
    if (loginBtn) loginBtn.style.display = 'flex';
    if (logoutBtn) logoutBtn.style.display = user ? 'block' : 'none';
    if (loginInfo) loginInfo.style.display = user ? 'block' : 'none';
  } else {
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
    if (loginInfo) loginInfo.style.display = 'block';
  }
  if (userName && user) userName.textContent = getSupabaseDisplayName(user);
  if (userEmail && user) userEmail.textContent = user.email || '';
  const picture = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';
  if (avatar && picture) {
    avatar.src = picture;
    avatar.style.display = 'block';
    StorageManager.setRaw('profilePhotoURL', picture);
  }
}

function setupGoogleAuthObserver() {
  const refresh = (event) => {
    const session = event?.detail?.session || getSupabaseSessionSafe();
    updateAuthUI(session?.user || null);
    updateAccountSyncStatus();
    if (session?.user) syncProfileWithBackend(null, { reason: 'session_changed' });
  };
  window.addEventListener('supabaseAuthReady', refresh);
  window.addEventListener('supabaseSessionChanged', refresh);
  refresh();
}
