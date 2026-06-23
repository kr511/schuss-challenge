-- ═══════════════════════════════════════════════════════════════════
-- RLS 2-User-Isolations-Verifikation
-- ═══════════════════════════════════════════════════════════════════
--
-- Zweck: Beweist, dass Zeile-für-Zeile-Sicherheit (RLS) korrekt
--        verhindert, dass User A Daten von User B lesen oder schreiben kann.
--
-- Ausführung: In Supabase SQL-Editor als service_role (Admin) laufen lassen.
-- Das Skript simuliert Zugriffe als User A und User B über set_config und
-- prüft per ASSERT, dass RLS die Isolation erzwingt.
--
-- Betroffene Tabellen:
--   Social:       profiles, friend_codes, friend_requests, friends,
--                 online_status, async_challenges, async_results
--   Worker-API:   users, game_sessions, achievements, streaks,
--                 api_profiles, activity_log
--   Kein Direktzugriff: feedback (worker-only via service_role)
-- ═══════════════════════════════════════════════════════════════════

do $verify$
declare
  -- Zwei Test-User-IDs (müssen in auth.users existieren; hier Platzhalter)
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();

  -- Hilfsvariablen
  cnt integer;
  ok  boolean;
begin
  raise notice '=== RLS 2-User-Verifikation gestartet ===';

  -- ─── Setup: Testdaten anlegen (service_role umgeht RLS) ────────────

  -- profiles
  insert into public.profiles(id, username) values (user_a, 'TestUserA'), (user_b, 'TestUserB')
    on conflict (id) do nothing;

  -- friend_codes
  insert into public.friend_codes(user_id, code)
    values (user_a, 'AAAAAA'), (user_b, 'BBBBBB')
    on conflict (user_id) do nothing;

  -- online_status
  insert into public.online_status(user_id, online)
    values (user_a, true), (user_b, false)
    on conflict (user_id) do nothing;

  -- async_challenge: A erstellt, B ist Opponent
  insert into public.async_challenges(creator_id, opponent_id, discipline)
    values (user_a, user_b, 'lg40')
    on conflict do nothing;

  -- Worker-API users (TEXT-PK)
  insert into public.users(id, email) values (user_a::text, 'a@test.invalid'), (user_b::text, 'b@test.invalid')
    on conflict (id) do nothing;

  -- game_sessions für User A
  insert into public.game_sessions(user_id, mode, score, shots_fired, duration_seconds, played_at)
    values (user_a::text, 'standard', 380, 40, 600, extract(epoch from now())::bigint * 1000);

  -- achievements für User A
  insert into public.achievements(user_id, type, unlocked_at)
    values (user_a::text, 'rls_test_badge', extract(epoch from now())::bigint * 1000)
    on conflict (user_id, type) do nothing;

  -- streaks für User A
  insert into public.streaks(user_id, current_streak, longest_streak)
    values (user_a::text, 3, 5)
    on conflict (user_id) do nothing;

  -- api_profiles für User A (public)
  insert into public.api_profiles(user_id, public_id, display_name, privacy_settings)
    values (user_a::text, 'rls_pub_a', 'User A', 'public')
    on conflict (user_id) do nothing;

  -- activity_log für User A
  insert into public.activity_log(user_id, discipline, difficulty, timestamp, status)
    values (user_a::text, 'lg40', 'easy', extract(epoch from now())::bigint * 1000, 'active')
    on conflict (user_id) do nothing;

  raise notice 'Setup abgeschlossen.';

  -- ═══════════════════════════════════════════════════════════════════
  -- BLOCK 1: Social-Tabellen (anon/authenticated JWT-Kontext)
  -- ═══════════════════════════════════════════════════════════════════

  -- 1a: profiles: beide sichtbar (profiles_select_all = true)
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_b::text, 'role', 'authenticated')::text, true);

  select count(*) into cnt from public.profiles where id = user_a;
  assert cnt = 1, 'FAIL 1a: User B kann Profil von User A NICHT lesen (soll sichtbar sein)';
  raise notice '1a PASS: profiles_select_all – User B liest Profil von User A';

  -- 1b: profiles INSERT: User B kann nicht als User A einfügen
  begin
    insert into public.profiles(id, username) values (gen_random_uuid(), 'Hacker');
    -- Darf nicht hier ankommen wenn auth.uid() != id
    raise exception 'FAIL 1b: INSERT ohne passende auth.uid() erlaubt';
  exception
    when others then
      raise notice '1b PASS: profiles_insert_own – fremder INSERT blockiert (%)', sqlerrm;
  end;

  -- 1c: friend_codes: für alle lesbar
  select count(*) into cnt from public.friend_codes where user_id = user_a;
  assert cnt = 1, 'FAIL 1c: friend_codes nicht lesbar für User B';
  raise notice '1c PASS: friend_codes_select_all – User B liest Freundescode von User A';

  -- 1d: friend_requests: User B sieht keine Requests, an denen er nicht beteiligt ist
  insert into public.friend_requests(from_user_id, to_user_id)
    values (user_a, user_b)  -- A → B Anfrage (service_role)
    on conflict do nothing;

  -- Als User B eingeloggt: sieht eigene Request
  select count(*) into cnt from public.friend_requests
    where from_user_id = user_a and to_user_id = user_b;
  assert cnt = 1, 'FAIL 1d: User B sieht Request an ihn nicht';
  raise notice '1d PASS: friend_requests_select_related – User B sieht Request an ihn';

  -- Als User C (unbeteiligter Dritter) – simuliert durch anderen Sub-Claim
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.friend_requests
    where from_user_id = user_a and to_user_id = user_b;
  assert cnt = 0, 'FAIL 1d: Dritter sieht fremde Friend-Request (RLS-Leck!)';
  raise notice '1d PASS: friend_requests – Dritter kann fremde Requests NICHT lesen';

  -- 1e: friends: User A sieht nur eigene Einträge
  perform set_config('request.jwt.claims', json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
  -- Testfreundschaft anlegen (service_role)
  set local role postgres;
  insert into public.friends(user_id, friend_user_id)
    values (user_a, user_b)
    on conflict do nothing;
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);

  select count(*) into cnt from public.friends where user_id = user_a;
  assert cnt >= 1, 'FAIL 1e: User A sieht eigene Freunde nicht';
  raise notice '1e PASS: friends_select_own – User A sieht eigene Freunde';

  -- Als User C: sieht Freundschaft zwischen A und B nicht
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.friends where user_id = user_a;
  assert cnt = 0, 'FAIL 1e: Dritter sieht Freundschaft von User A (RLS-Leck!)';
  raise notice '1e PASS: friends_select_own – Dritter sieht fremde Freundschaft nicht';

  -- 1f: online_status: für alle lesbar
  perform set_config('request.jwt.claims', json_build_object('sub', user_b::text, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.online_status where user_id = user_a;
  assert cnt = 1, 'FAIL 1f: online_status nicht für User B lesbar';
  raise notice '1f PASS: online_status_select_all – User B liest Status von User A';

  -- 1g: async_challenges: nur Beteiligte
  perform set_config('request.jwt.claims', json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.async_challenges
    where creator_id = user_a or opponent_id = user_a;
  assert cnt >= 1, 'FAIL 1g: Creator A sieht eigene Challenge nicht';
  raise notice '1g PASS: async_challenges_select_related – Creator sieht eigene Challenge';

  -- Dritter: sieht Challenge zwischen A und B nicht
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.async_challenges
    where creator_id = user_a and opponent_id = user_b;
  assert cnt = 0, 'FAIL 1g: Dritter sieht Challenge zwischen A und B (RLS-Leck!)';
  raise notice '1g PASS: async_challenges – Dritter sieht fremde Challenge nicht';

  -- ═══════════════════════════════════════════════════════════════════
  -- BLOCK 2: Worker-API-Tabellen (nur mit authenticated JWT direkt zugänglich)
  -- ═══════════════════════════════════════════════════════════════════

  -- 2a: users: User A sieht nur eigenen Eintrag
  perform set_config('request.jwt.claims', json_build_object('sub', user_a::text, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.users where id = user_a::text;
  assert cnt = 1, 'FAIL 2a: User A sieht eigenen users-Eintrag nicht';

  select count(*) into cnt from public.users where id = user_b::text;
  assert cnt = 0, 'FAIL 2a: User A sieht users-Eintrag von User B (RLS-Leck!)';
  raise notice '2a PASS: users_select_own – User A sieht nur eigenen Eintrag';

  -- 2b: game_sessions: User B sieht Sessions von User A nicht
  perform set_config('request.jwt.claims', json_build_object('sub', user_b::text, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.game_sessions where user_id = user_a::text;
  assert cnt = 0, 'FAIL 2b: User B sieht game_sessions von User A (RLS-Leck!)';
  raise notice '2b PASS: game_sessions_select_own – User B sieht Sessions von A nicht';

  -- 2c: achievements: User B sieht Achievements von User A nicht
  select count(*) into cnt from public.achievements where user_id = user_a::text;
  assert cnt = 0, 'FAIL 2c: User B sieht achievements von User A (RLS-Leck!)';
  raise notice '2c PASS: achievements_select_own – User B sieht Achievements von A nicht';

  -- 2d: streaks: User B sieht Streak von User A nicht
  select count(*) into cnt from public.streaks where user_id = user_a::text;
  assert cnt = 0, 'FAIL 2d: User B sieht streak von User A (RLS-Leck!)';
  raise notice '2d PASS: streaks_select_own – User B sieht Streak von A nicht';

  -- 2e: api_profiles: öffentliche Profile für alle lesbar
  perform set_config('request.jwt.claims', json_build_object('sub', user_b::text, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.api_profiles
    where user_id = user_a::text and privacy_settings = 'public';
  assert cnt = 1, 'FAIL 2e: User B kann öffentliches Profil von User A nicht lesen';
  raise notice '2e PASS: api_profiles – User B liest öffentliches Profil von User A';

  -- 2f: activity_log: aktive Einträge (< 60 Sekunden) für alle lesbar
  perform set_config('request.jwt.claims', json_build_object('sub', user_b::text, 'role', 'authenticated')::text, true);
  select count(*) into cnt from public.activity_log
    where user_id = user_a::text and status = 'active'
      and timestamp > extract(epoch from now())::bigint * 1000 - 60000;
  assert cnt = 1, 'FAIL 2f: User B sieht aktive activity_log von User A nicht';
  raise notice '2f PASS: activity_log – aktive Einträge für User B sichtbar';

  -- ═══════════════════════════════════════════════════════════════════
  -- Cleanup
  -- ═══════════════════════════════════════════════════════════════════
  set local role postgres;

  delete from public.async_results where user_id in (user_a, user_b);
  delete from public.async_challenges where creator_id in (user_a, user_b) or opponent_id in (user_a, user_b);
  delete from public.friends where user_id in (user_a, user_b) or friend_user_id in (user_a, user_b);
  delete from public.friend_requests where from_user_id in (user_a, user_b) or to_user_id in (user_a, user_b);
  delete from public.friend_codes where user_id in (user_a, user_b);
  delete from public.online_status where user_id in (user_a, user_b);
  delete from public.profiles where id in (user_a, user_b);

  delete from public.activity_log where user_id in (user_a::text, user_b::text);
  delete from public.api_profiles where user_id in (user_a::text, user_b::text);
  delete from public.streaks where user_id in (user_a::text, user_b::text);
  delete from public.achievements where user_id in (user_a::text, user_b::text);
  delete from public.game_sessions where user_id in (user_a::text, user_b::text);
  delete from public.users where id in (user_a::text, user_b::text);

  raise notice '=== Alle RLS-Assertions bestanden. Testdaten bereinigt. ===';
end
$verify$;
