# Supabase SQL – Status & Advisor-Follow-ups

Aktueller Stand (Mai 2026): **Die SQL-Migrationen sind live.**
Das Projekt `fknftkvozwfkcarldzms` (Schuss-Challenge) ist `ACTIVE_HEALTHY`,
**13 Migrationen** sind angewendet und alle **25 `public`-Tabellen** existieren
mit aktivierter RLS (u. a. `profiles`, `friends`, `friend_requests`,
`online_status`, `async_challenges`, `training_results`, `leaderboard_entries`,
`clubs`/`club_*`, `messages`, `push_subscriptions`, `feedback`, `activity_log`).

> Diese Datei beschrieb früher das *erstmalige* Ausführen der Migrationen. Das
> ist erledigt. Sie dient jetzt als Status- und Advisor-Notiz.

## Advisor-Follow-ups (`get_advisors`)

### Erledigt
- **`function_search_path_mutable`** für `public.touch_updated_at`: per Migration
  `harden_touch_updated_at_search_path` ein festes `search_path = ''` gesetzt.
  Sicher, da der Trigger nur `NEW.updated_at := now()` macht (keine Tabellen-Refs).

### Bewusst unverändert (kein Bug)
- **`public.feedback`: RLS aktiv, keine Policy** → Default-Deny. Das ist korrekt:
  Feedback wird ausschließlich über den Cloudflare-Worker geschrieben
  (`fetch('…workers.dev/api/feedback')`, Service-Role-Key ⇒ RLS-Bypass; vgl.
  `supabase/migrations/0008_worker_api_rls.sql`). Eine anon/authenticated-Policy
  würde die Tabelle unnötig für Clients öffnen.
- **`SECURITY DEFINER`-RPCs** (`get_leaderboard`, `get_user_stats`,
  `accept_friend_request`, `remove_friend`, `join_club_by_code`,
  `create_club_with_owner`, `record_club_duel`, …) sind absichtlich per
  PostgREST aufrufbar – das ist das Client-API-Design.

### Offen – manueller Dashboard-Schritt
- **Leaked Password Protection** aktivieren (prüft Passwörter gegen
  HaveIBeenPwned): Supabase Dashboard → **Authentication → Sign In / Providers →
  Password → „Leaked password protection" einschalten**. Nicht per MCP/SQL
  setzbar, daher manuell.

## Künftige Migrationen anwenden

Bevorzugt per Management API (Token mit DB-Schreibzugriff in `.dev.vars` als
`SUPABASE_ACCESS_TOKEN=sbp_…`):

```bash
npm run supabase:apply
```

Alternativ manuell im SQL Editor (Dashboard → SQL Editor → New query → Inhalt
der jeweiligen Datei aus `supabase/migrations/` einfügen → Run).

## Verifikation

```sql
-- Tabellen
select table_name from information_schema.tables
where table_schema = 'public' order by table_name;

-- Wichtige RPCs
select p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('touch_my_profile', 'accept_friend_request', 'remove_friend')
order by p.proname;
```
