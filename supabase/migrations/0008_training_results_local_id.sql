-- Schuss Challenge: Quick-Training Sync-Härtung.
-- Additive Migration. Idempotent ausführbar.
--
-- Ziel: Dedup beim Sync von lokal erfassten Quick-Training-Einträgen
-- (src/features/quick-training.js) erfolgt künftig über eine echte Spalte
-- training_results.local_id statt über einen notes-Marker (LIKE 'qt:<id>').
--
-- 1) Spalte training_results.local_id hinzufügen (nullbar, Backfill nicht nötig).
-- 2) Partieller UNIQUE-Index auf (user_id, local_id) für not-null-Werte —
--    so bleiben bestehende Zeilen ohne local_id erlaubt, neue Inserts mit
--    local_id sind pro User eindeutig.

alter table public.training_results
  add column if not exists local_id text;

create unique index if not exists training_results_user_local_id_uidx
  on public.training_results (user_id, local_id)
  where local_id is not null;
