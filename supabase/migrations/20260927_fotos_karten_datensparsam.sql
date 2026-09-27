-- v636 · Datenschutz-Audit 27.09. (eingespielt am 27.09.)
-- Fotos: „App-intern“ bleibt in der App. Der Spiegel setzte kader.foto_stadionheft_ok aus
-- foto_consent.intern – und genau dieses Feld öffnet das Foto auf der ÖFFENTLICHEN Stadionheft-Seite.
-- Jetzt spiegelt es die Stufe „öffentlich“. Die App-interne Sichtbarkeit (Galerie, Speicher) liest
-- foto_consent.intern direkt und nur für Mitglieder.
create or replace function public.foto_consent_mirror() returns trigger
 language plpgsql security definer set search_path to 'public' as $function$
begin
  if pg_trigger_depth() > 1 then return new; end if;
  update public.kader set foto_stadionheft_ok = coalesce(new.public_ok,false)
    where id = new.spieler_id and foto_stadionheft_ok is distinct from coalesce(new.public_ok,false);
  return new;
end $function$;
update public.kader k set foto_stadionheft_ok = coalesce(c.public_ok,false)
  from public.foto_consent c where c.spieler_id = k.id and k.foto_stadionheft_ok is distinct from coalesce(c.public_ok,false);

-- Galerie: keine Stärken und keine Trainingszahlen fremder Kinder (Beschluss 13.09.).
create or replace function public.team_gallery_kind() returns jsonb
 language sql stable security definer set search_path to 'public' as $function$
  select case when not public.sitzung_gueltig() then '[]'::jsonb
              else coalesce(jsonb_agg(g order by g->>'name'), '[]'::jsonb) end from (
    select jsonb_build_object(
      'spieler_id', k.id, 'name', k.name, 'nr', k.nr, 'tw', k.tw,
      'spitzname', f.spitzname, 'lieblingsverein', f.lieblingsverein, 'lieblingsspieler', f.lieblingsspieler,
      'staerken', case when public.is_trainer() or public.is_parent_of(k.id) or public.is_kind_selbst(k.id)
                       then public.staerken_von(k.name) else null end,
      'foto_path', case when coalesce(f.gallery_optin,false)
                          or exists(select 1 from public.foto_consent c where c.spieler_id=k.id and c.intern)
                        then coalesce(f.foto_path, k.foto_path) else null end,
      'trainings', case when public.is_trainer() or public.is_parent_of(k.id) or public.is_kind_selbst(k.id)
                        then (select count(*) from public.anwesenheit a
                               where (coalesce(a.data->(k.id::text), a.data->k.name)->>'da')='true') else null end
    ) as g
    from public.kader k left join public.kind_fanfacts f on f.spieler_id=k.id
    where k.aktiv) x;
$function$;

-- Speicher: freigegebene Fotos nur für Mitglieder.
alter policy "spielerfotos auth select" on storage.objects using (
  bucket_id = 'spielerfotos' and (
    public.is_trainer()
    or exists (select 1 from public.kader k where k.foto_path = objects.name and public.is_parent_of(k.id))
    or (objects.name ~ '^[0-9]+/' and public.is_parent_of(split_part(objects.name,'/',1)::bigint))
    or (public.sitzung_gueltig() and exists (
          select 1 from public.kader k left join public.kind_fanfacts f on f.spieler_id = k.id
           where (coalesce(f.gallery_optin,false) or exists(select 1 from public.foto_consent c where c.spieler_id=k.id and c.intern))
             and (objects.name = f.foto_path or objects.name = k.foto_path)))));

-- Elternkarte: Rohwerte nur noch für Trainer; Eltern bekommen die drei Stärken als Schlüssel.
do $do$ declare d text; begin
  d := pg_get_functiondef('public.my_child_card(bigint)'::regprocedure);
  d := replace(d, $x$'radios', coalesce(v_snap.radios, '{}'::jsonb),$x$,
                  $x$'radios', case when public.is_trainer() then coalesce(v_snap.radios, '{}'::jsonb) else null end, 'staerken', public.staerken_von(v_name),$x$);
  if position('staerken_von(v_name)' in d)=0 then raise notice 'my_child_card: schon angepasst'; else execute d; end if;
end $do$;
