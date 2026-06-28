-- 0023_external_id_unique.sql
--
-- Ensures that (source, external_id) is strictly unique across ingestion tables
-- to allow idempotent UPSERTs via PostgREST (resolution=merge-duplicates) and
-- prevent duplicated records during recurrent syncing.

alter table damaged_reports 
  add constraint damaged_reports_source_external_id_key unique (source, external_id);

alter table checkins 
  add constraint checkins_source_external_id_key unique (source, external_id);

alter table help_requests 
  add constraint help_requests_source_external_id_key unique (source, external_id);
