-- v794 · Tagebuch: Was durchgeführt wurde und wer dabei war, steht im Eintrag.
-- durchgefuehrt: [{"name":"Übungsname","block":"Hauptteil"}, …] aus dem Trainingsplan des Tages (dazu die Spielform des Abschlussspiels)
-- anwesend: kader.id der Kinder, die laut Anwesenheit da waren. Beides füllt die App beim Entstehen des Eintrags;
-- die Sicht je Kind (tagebuch_kind) bleibt davon unberührt. Rechte wie bisher: nur Trainer (RLS der Tabelle).
alter table public.tagebuch_eintrag add column if not exists durchgefuehrt jsonb not null default '[]'::jsonb;
alter table public.tagebuch_eintrag add column if not exists anwesend bigint[] not null default '{}';
alter table public.tagebuch_eintrag drop constraint if exists tagebuch_eintrag_durchgefuehrt_check;
alter table public.tagebuch_eintrag add constraint tagebuch_eintrag_durchgefuehrt_check check (jsonb_typeof(durchgefuehrt) = 'array');
comment on column public.tagebuch_eintrag.durchgefuehrt is 'v794: Übungen und Spielform der Einheit: [{name, block}]';
comment on column public.tagebuch_eintrag.anwesend is 'v794: kader.id der anwesenden Kinder (Anwesenheit des Tages)';
