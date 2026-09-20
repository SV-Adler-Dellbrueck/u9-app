-- Kinder-App, Schritt 3: Deckel gegen das Durchprobieren des Kopplungscodes
--
-- Ein sechsstelliger Code hat eine Million Moeglichkeiten. Ohne Deckel liesse er sich
-- in Stunden durchprobieren, und wer ihn errät, bekommt ein Kindergeraet auf ein fremdes
-- Kind. Die Edge Function kind-kopplung zaehlt hier die Fehlversuche je Geraet.
--
-- Geschrieben wird ausschliesslich mit dem Dienstschluessel aus der Funktion, gelesen
-- ebenso - deshalb RLS an und bewusst KEINE Policy: niemand sonst hat hier etwas zu tun.
create table if not exists public.kind_kopplung_versuch (
  id  bigint generated always as identity primary key,
  uid uuid        not null,
  ts  timestamptz not null default now()
);
comment on table public.kind_kopplung_versuch is
  'Fehlversuche beim Einloesen eines Kopplungscodes. Nur die Edge Function kind-kopplung schreibt und liest hier.';
create index if not exists kind_kopplung_versuch_uid_ts_idx
  on public.kind_kopplung_versuch (uid, ts desc);

alter table public.kind_kopplung_versuch enable row level security;
