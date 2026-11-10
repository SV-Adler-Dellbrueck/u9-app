-- v827 · Mehrere Events am selben Tag (Charles 10.11.2026)
--
-- Anlass: Am 07.12.2026 beginnt ein Kinder-Eltern-Turnier, danach die Weihnachtsfeier – zwei Events am selben
-- Tag. Der Index termine_datum_typ_uidx ließ je Tag nur einen Termin derselben Art zu; das zweite Event wurde
-- mit 23505 abgelehnt.
--
-- Neu:
--   · Training, Spiel, Turnier und Trainermeeting bleiben je Tag einmalig (Plan, Anwesenheit, Einteilung und
--     Aufstellung hängen am Datum).
--   · Events dürfen mehrfach am Tag stehen, aber nicht doppelt: gleicher Tag, gleiche Uhrzeit und gleicher Titel
--     bleiben ausgeschlossen. Das fängt den Doppeltipp auf „Termin anlegen“ ab, den der alte Index verhinderte.
--
-- Geprüft: Keine Funktion, keine Ansicht und kein App-Aufruf baut auf dem Schlüssel (datum, typ) auf
-- (on_conflict nur auf datum in anderen Tabellen). Events führen keine Anwesenheit, keinen Plan, keine Einteilung.
-- Bekannt und unverändert: Die Abschrift für den Eltern-Link (matchday) hat das Datum als Schlüssel; haben mehrere
-- Termine denselben Tag, gewinnt der zuletzt gespeicherte (so ist es heute schon am 28.09.: Event und Training).
-- Der Saison-Kalender (season-ics) führt die Termine über ihre Nummer und zeigt beide Events.

create unique index termine_datum_typ_uidx_neu
  on public.termine (datum, typ) where typ <> 'event';

create unique index termine_event_tag_zeit_titel_uidx
  on public.termine (datum, coalesce(uhrzeit, time '00:00'), coalesce(btrim(titel), '')) where typ = 'event';

drop index public.termine_datum_typ_uidx;
alter index public.termine_datum_typ_uidx_neu rename to termine_datum_typ_uidx;
