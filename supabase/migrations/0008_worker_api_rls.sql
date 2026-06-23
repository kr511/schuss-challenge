-- RLS-Policies für Worker-API-Tables
--
-- Kontext: Diese Tabellen (users, game_sessions, achievements, streaks,
-- feedback, api_profiles, activity_log) werden ausschließlich über den
-- Cloudflare Worker mit dem service_role-Key beschrieben und gelesen.
-- Der service_role-Key umgeht RLS grundsätzlich – die Worker-Funktionalität
-- ist davon unberührt.
--
-- Die Policies hier definieren, was direkte Supabase-Client-Zugriffe
-- (anon / authenticated JWT) dürfen. Das dokumentiert den Intent explizit
-- und verhindert unbeabsichtigten Datenzugriff über die Supabase REST-API.
--
-- Idempotent: Alle Policies werden mit DROP IF EXISTS + CREATE neu angelegt.

-- ─── users ────────────────────────────────────────────────────────────────
-- id ist TEXT (nicht UUID) – auth.uid() muss gecastet werden.
-- Nutzer dürfen ihr eigenes Basisprofil lesen.

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select
  using (auth.uid()::text = id);

-- ─── game_sessions ─────────────────────────────────────────────────────────
-- Nutzer dürfen eigene Spielsitzungen lesen.

drop policy if exists "game_sessions_select_own" on public.game_sessions;
create policy "game_sessions_select_own" on public.game_sessions
  for select
  using (auth.uid()::text = user_id);

-- ─── achievements ──────────────────────────────────────────────────────────
-- Nutzer dürfen eigene Achievements lesen.

drop policy if exists "achievements_select_own" on public.achievements;
create policy "achievements_select_own" on public.achievements
  for select
  using (auth.uid()::text = user_id);

-- ─── streaks ──────────────────────────────────────────────────────────────
-- Nutzer dürfen eigenen Streak lesen.

drop policy if exists "streaks_select_own" on public.streaks;
create policy "streaks_select_own" on public.streaks
  for select
  using (auth.uid()::text = user_id);

-- ─── feedback ─────────────────────────────────────────────────────────────
-- Kein direkter Lesezugriff. Feedback wird über den Worker eingereicht
-- und ist ausschließlich für Admins (über Worker/Admin-Endpoints) sichtbar.
-- Keine Policies = deny by default für anon/authenticated.

-- ─── api_profiles ─────────────────────────────────────────────────────────
-- Öffentliche Profile sind für alle lesbar.
-- Eigenes Profil ist immer lesbar (unabhängig von privacy_settings).

drop policy if exists "api_profiles_select_public_or_own" on public.api_profiles;
create policy "api_profiles_select_public_or_own" on public.api_profiles
  for select
  using (
    privacy_settings = 'public'
    or auth.uid()::text = user_id
  );

-- ─── activity_log ─────────────────────────────────────────────────────────
-- Aktive Einträge der letzten 60 Sekunden sind öffentlich lesbar.
-- Das erlaubt die Live-Aktivitätsanzeige auch bei zukünftigem
-- direktem Supabase-Client-Zugriff (aktuell über Worker).

drop policy if exists "activity_log_select_active_recent" on public.activity_log;
create policy "activity_log_select_active_recent" on public.activity_log
  for select
  using (
    status = 'active'
    and "timestamp" > (extract(epoch from now()) * 1000)::bigint - 60000
  );
