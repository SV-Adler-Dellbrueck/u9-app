-- v789 · Aus der Adlerschmiede: Eltern-Neuerung „Spielplan im Termin“ (Charles 05.11.: „Ja, Adlerschmiede-Zeile eintragen“).
-- Wortlaut und Emoji wurden Charles vorher gezeigt (CLAUDE.md, Pflicht 9). Im SQL-Editor einspielen; der Sonntags-Push zeigt nur den Kurztitel.
insert into public.adlerschmiede (datum, version, emoji, text)
select '2026-11-05', 'v789', '📎',
       'Spielplan im Termin: Hängt das Trainerteam den Spielplan der Gastgeber an, steht er jetzt direkt im Termin – als Bild oder PDF, zum Vergrößern einfach antippen.'
where not exists (select 1 from public.adlerschmiede where version = 'v789' and emoji = '📎');
