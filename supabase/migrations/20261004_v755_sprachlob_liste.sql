-- v755 · Sprachlob als Liste in der Kabine und im Eltern-Bereich: „gehört am“
-- Charles 04.10.: „Das Sprachlob soll auch in der Kabine sein und dort sollen die gesammelt werden mit Datumsansicht
-- zum Abhören. Die Eltern und das Kind sollen darüber eine Info erhalten.“
--
-- Eine Zeile je Lob steht schon in kabine_lob (Kind, Pfad im privaten Bucket kabine-lob, Zeitpunkt). Neu ist nur,
-- ob es schon angehört wurde: gehoert_am. Daran hängen der „Neu“-Punkt in der Kabine und die ruhigere Darstellung
-- gehörter Lobe. Setzen dürfen es Kind (eigenes Gerät), Eltern des Kindes und das Trainerteam – und nur diese Spalte,
-- nur einmal (Spalte bleibt, sobald sie gesetzt ist: der Browser schickt gehoert_am=is.null mit).

alter table public.kabine_lob add column if not exists gehoert_am timestamptz;
comment on column public.kabine_lob.gehoert_am is 'v755: wann das Sprachlob zum ersten Mal angehört wurde (Kind, Eltern oder Trainerteam)';

drop policy if exists kl_gehoert on public.kabine_lob;
create policy kl_gehoert on public.kabine_lob for update to authenticated
  using (public.is_trainer() or public.is_parent_of(spieler_id) or public.is_kind_selbst(spieler_id))
  with check (public.is_trainer() or public.is_parent_of(spieler_id) or public.is_kind_selbst(spieler_id));
revoke update on public.kabine_lob from authenticated;
grant update (gehoert_am) on public.kabine_lob to authenticated;
revoke update on public.kabine_lob from anon;
