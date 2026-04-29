# Supabase SQL next step

Aktueller Stand: Die SQL-Migrationen sind noch nicht live ausgefuehrt.

## Variante A: automatisch per Supabase Management API

Das ist der bevorzugte Weg, wenn du einen Supabase Access Token hast.

1. Supabase Dashboard oeffnen.
2. Account -> Access Tokens oeffnen.
3. Einen Token mit Datenbank-Schreibzugriff fuer dieses Projekt erstellen.
4. Wenn Codex die Migration ausfuehren soll, lokal in `.dev.vars` eintragen:

```text
SUPABASE_ACCESS_TOKEN=sbp_DEIN_TOKEN
```

5. Dann ausfuehren:

```powershell
npm.cmd run supabase:apply
```

Alternativ kannst du den Token nur fuer deine eigene PowerShell-Session setzen:

```powershell
$env:SUPABASE_ACCESS_TOKEN="sbp_DEIN_TOKEN"
npm.cmd run supabase:apply
```

Das Script nutzt die offizielle Management API `POST /v1/projects/{ref}/database/query`, fuehrt die Migrationen nacheinander aus und prueft danach Tabellen + RPCs.

## Variante B: manuell im SQL Editor

Nutze das, wenn kein Supabase Access Token vorhanden ist.

## Was jetzt ausfuehren

Oeffne diese Datei:

```text
supabase/run-all-migrations.sql
```

Dann:

1. Supabase Dashboard oeffnen.
2. Projekt oeffnen.
3. SQL Editor -> New query.
4. Inhalt von `supabase/run-all-migrations.sql` einfuegen.
5. Run ausfuehren.

Der Bundle enthaelt diese Migrationen in Reihenfolge:

```text
0001_social_tables.sql
0002_social_indexes.sql
0003_social_rls.sql
0004_social_rpc.sql
0005_worker_api_tables.sql
0005_training_leaderboard.sql
0006_social_remove_friend_rpc.sql
```

## Danach pruefen

Fuehre nach dem Run diese Pruef-Query im SQL Editor aus:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles',
    'friend_codes',
    'friend_requests',
    'friends',
    'online_status',
    'async_challenges',
    'async_results',
    'users',
    'game_sessions',
    'achievements',
    'streaks',
    'feedback',
    'api_profiles',
    'activity_log',
    'training_sessions',
    'training_results',
    'leaderboard_entries'
  )
order by table_name;
```

Erwartung: Alle 17 Tabellen werden angezeigt.

Dann die wichtigen RPCs pruefen:

```sql
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'touch_my_profile',
    'accept_friend_request',
    'remove_friend'
  )
order by p.proname;
```

Erwartung: Alle 3 Funktionen werden angezeigt.

## Naechster Block danach

Erst wenn SQL live ist:

1. Google OAuth in Supabase aktivieren.
2. `SUPABASE_SERVICE_KEY` und `SUPABASE_JWT_SECRET` mit Wrangler setzen.
3. Worker deployen.
4. Supabase Leaderboard testen.
5. Training V1 bauen.
