-- v716 (PO 02.10.): „Ich kann, wenn ich die Übung bearbeite, den Namen nicht mehr ändern. Das wäre
-- aber gut. Zusätzlich sollte es auch möglich sein, Übungen zu archivieren und aus der aktiven
-- Liste zu entfernen.“
--
-- Seit v586 finden Pläne, Bewertungen, Vorlagen und die Einordnung ihre Übung über den NAMEN.
-- Umbenennen heißt deshalb: an allen diesen Stellen in einem Zug mit umbenennen. Die Tabelle
-- uebung_umbenannt merkt sich alt → neu – der Bibliotheksabgleich legt die alte Fassung dann nicht
-- wieder an, und Regeln im Code (Provokationsregeln, Zusatzregeln) finden die Übung weiter.
-- Das Archiv ist eine Namensliste in team_config: gilt für eigene und mitgelieferte Übungen gleich.

create table if not exists public.uebung_umbenannt (
  id bigint generated always as identity primary key,
  alt text not null,
  neu text not null,
  am timestamptz not null default now(),
  von uuid default auth.uid()
);
alter table public.uebung_umbenannt enable row level security;
create policy uebung_umbenannt_lesen on public.uebung_umbenannt for select to authenticated using (public.is_trainer());
-- Geschrieben wird nur über die Funktion unten (security definer).
revoke all on public.uebung_umbenannt from anon;

alter table public.team_config add column if not exists uebung_archiv jsonb not null default '[]'::jsonb;

create or replace function public.uebung_umbenennen(p_alt text, p_neu text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_neu text := btrim(coalesce(p_neu, ''));
  n_form int := 0; n_plan int := 0; n_slots int := 0; n_eval int := 0; n_vorl int := 0; n_live int := 0;
begin
  if not public.is_trainer() then raise exception 'nur fuer Trainer'; end if;
  if v_neu = '' or v_neu = p_alt then raise exception 'Name leer oder unveraendert'; end if;
  if exists (select 1 from trainingsformen where lower(name) = lower(v_neu)) then raise exception 'Name schon vergeben'; end if;

  update trainingsformen set name = v_neu where name = p_alt;
  get diagnostics n_form = row_count;
  if n_form = 0 then raise exception 'Uebung nicht gefunden'; end if;

  -- Trainingsplan: Einträge (formName) …
  update trainingsplan t set plan = (
      select jsonb_agg(case when e->>'formName' = p_alt then jsonb_set(e, '{formName}', to_jsonb(v_neu)) else e end order by o)
      from jsonb_array_elements(t.plan) with ordinality x(e, o))
    where jsonb_typeof(t.plan) = 'array' and t.plan @> jsonb_build_array(jsonb_build_object('formName', p_alt));
  get diagnostics n_plan = row_count;
  -- … und Stationstexte (slots[].felder[].u)
  update trainingsplan t set slots = (
      select jsonb_agg(case when jsonb_typeof(s->'felder') = 'array' then jsonb_set(s, '{felder}', (
          select jsonb_agg(case when f->>'u' = p_alt then jsonb_set(f, '{u}', to_jsonb(v_neu)) else f end order by fo)
          from jsonb_array_elements(s->'felder') with ordinality y(f, fo))) else s end order by so)
      from jsonb_array_elements(t.slots) with ordinality z(s, so))
    where jsonb_typeof(t.slots) = 'array' and exists (
      select 1 from jsonb_array_elements(t.slots) s2
      where jsonb_typeof(s2->'felder') = 'array' and exists (select 1 from jsonb_array_elements(s2->'felder') f2 where f2->>'u' = p_alt));
  get diagnostics n_slots = row_count;

  -- Bewertungen der Einheit (name oder formName)
  update trainings_eval t set data = (
      select jsonb_agg(case
          when e->>'name' = p_alt and e->>'formName' = p_alt then jsonb_set(jsonb_set(e, '{name}', to_jsonb(v_neu)), '{formName}', to_jsonb(v_neu))
          when e->>'name' = p_alt then jsonb_set(e, '{name}', to_jsonb(v_neu))
          when e->>'formName' = p_alt then jsonb_set(e, '{formName}', to_jsonb(v_neu))
          else e end order by o)
      from jsonb_array_elements(t.data) with ordinality x(e, o))
    where jsonb_typeof(t.data) = 'array' and (t.data @> jsonb_build_array(jsonb_build_object('name', p_alt))
                                           or t.data @> jsonb_build_array(jsonb_build_object('formName', p_alt)));
  get diagnostics n_eval = row_count;

  -- Vorlagen: Block-Übung und Stationen
  update trainingsvorlagen v set bloecke = (
      select jsonb_agg(
          case when jsonb_typeof(b->'stationen') = 'array' then jsonb_set(b1, '{stationen}', (
              select jsonb_agg(case when st->>'uebung_name' = p_alt then jsonb_set(st, '{uebung_name}', to_jsonb(v_neu)) else st end order by so)
              from jsonb_array_elements(b->'stationen') with ordinality y(st, so)))
          else b1 end order by o)
      from jsonb_array_elements(v.bloecke) with ordinality x(b, o),
           lateral (select case when b->>'uebung_name' = p_alt then jsonb_set(b, '{uebung_name}', to_jsonb(v_neu)) else b end as b1) l)
    where jsonb_typeof(v.bloecke) = 'array' and v.bloecke::text like '%' || replace(replace(p_alt, '%', '\%'), '_', '\_') || '%';
  get diagnostics n_vorl = row_count;

  -- Laufendes Training (slots[].gruppen[].uebung)
  update training_live t set plan = jsonb_set(t.plan, '{slots}', (
      select jsonb_agg(case when jsonb_typeof(s->'gruppen') = 'array' then jsonb_set(s, '{gruppen}', (
          select jsonb_agg(case when g->>'uebung' = p_alt then jsonb_set(g, '{uebung}', to_jsonb(v_neu)) else g end order by go)
          from jsonb_array_elements(s->'gruppen') with ordinality y(g, go))) else s end order by so)
      from jsonb_array_elements(t.plan->'slots') with ordinality z(s, so)))
    where jsonb_typeof(t.plan->'slots') = 'array' and t.plan::text like '%' || replace(replace(p_alt, '%', '\%'), '_', '\_') || '%';
  get diagnostics n_live = row_count;

  -- Einordnung (Sterne, Art, Betreuung) und Archiv
  update team_config set
    uebung_meta = case when uebung_meta ? p_alt then (uebung_meta - p_alt) || jsonb_build_object(v_neu, uebung_meta->p_alt) else uebung_meta end,
    uebung_art = case when uebung_art ? p_alt then (uebung_art - p_alt) || jsonb_build_object(v_neu, uebung_art->p_alt) else uebung_art end,
    uebung_betreuung = case when uebung_betreuung ? p_alt then (uebung_betreuung - p_alt) || jsonb_build_object(v_neu, uebung_betreuung->p_alt) else uebung_betreuung end,
    uebung_archiv = case when uebung_archiv ? p_alt then (uebung_archiv - p_alt) || jsonb_build_array(v_neu) else uebung_archiv end
  where true;

  insert into uebung_umbenannt(alt, neu) values (p_alt, v_neu);

  return jsonb_build_object('uebung', n_form, 'plaene', n_plan, 'stationen', n_slots, 'bewertungen', n_eval, 'vorlagen', n_vorl, 'live', n_live);
end;
$$;
revoke all on function public.uebung_umbenennen(text, text) from public, anon;
grant execute on function public.uebung_umbenennen(text, text) to authenticated;
