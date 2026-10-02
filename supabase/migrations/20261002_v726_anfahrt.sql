-- v726 (PO 02.10.): Entfernung und Fahrzeit vom Platz in Dellbrück zum Auswärtsort, einmal je Adresse
-- auf einem Trainergerät gerechnet (OSRM/OpenStreetMap) und hier abgelegt; Eltern lesen nur.
alter table public.termine
  add column if not exists anfahrt_km numeric(6,1),
  add column if not exists anfahrt_min int,
  add column if not exists anfahrt_ort text;
comment on column public.termine.anfahrt_km is 'v726: Fahrstrecke ab Thurner Kamp 97 in km (OSRM, ohne Verkehr)';
comment on column public.termine.anfahrt_min is 'v726: Fahrzeit ab Thurner Kamp 97 in Minuten (OSRM, ohne Verkehr)';
comment on column public.termine.anfahrt_ort is 'v726: Adresse, für die gerechnet wurde – weicht ort ab, rechnet die App neu';
