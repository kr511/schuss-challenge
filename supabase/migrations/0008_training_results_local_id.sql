-- Schuss Challenge: Training-Result local_id.
-- Additive Migration. Idempotent ausfuehrbar.
--
-- Ziel: Dedup beim Sync lokal erzeugter Trainingsergebnisse ueber
-- training_results.local_id statt ueber notes-Marker.
--
-- 1) Spalte training_results.local_id hinzufuegen (nullbar, Backfill nicht noetig).
-- 2) Partieller UNIQUE-Index auf (user_id, local_id) fuer not-null-Werte -
--    so bleiben bestehende Zeilen ohne local_id erlaubt, neue Inserts mit
--    local_id sind pro User eindeutig.

alter table public.training_results
  add column if not exists local_id text;

create unique index if not exists training_results_user_local_id_uidx
  on public.training_results (user_id, local_id)
  where local_id is not null;
