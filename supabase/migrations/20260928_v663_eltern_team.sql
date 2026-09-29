-- v663 · Ansprechpartner im Team (Elternbeirat, Kasse) und Beitrag der Mannschaftskasse
-- PO 28.09.: „in der App sollte auch unter ‚Mehr vom Team' der gewählte Elternbeirat stehen und
-- Kassenwart … Mannschaftskasse: 40 €/Saison.“ Die Namen stehen nur in der Datenbank, nie im
-- öffentlichen Repo. Lesen: alle Mitglieder (tc_read), schreiben: Trainer (tc_write).
-- {"rollen":[{"rolle":"Elternbeirat","name":"…"}],"kasse_beitrag":"40 € pro Saison"}
alter table public.team_config add column if not exists eltern_team jsonb
  check (eltern_team is null or (jsonb_typeof(eltern_team) = 'object'
         and (not (eltern_team ? 'rollen') or (jsonb_typeof(eltern_team->'rollen') = 'array' and jsonb_array_length(eltern_team->'rollen') <= 8))));
comment on column public.team_config.eltern_team is
  'v663: Ansprechpartner aus der Elternschaft (Rolle, Name) und Beitrag der Mannschaftskasse – im Eltern-Bereich unter „Mehr vom Team“.';
