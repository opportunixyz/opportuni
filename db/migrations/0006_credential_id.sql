-- 0006_credential_id: el check de 0005 usaba '{16,1400}' y Postgres no admite
-- repeticiones de más de 255 en una expresión regular; truena al guardar la
-- primera passkey. Mismo límite, con length().
alter table public.pasaportes drop constraint pasaportes_credential_id_check;
alter table public.pasaportes add constraint pasaportes_credential_id_check
  check (length(credential_id) between 16 and 1400 and credential_id ~ '^[A-Za-z0-9_-]+$');
