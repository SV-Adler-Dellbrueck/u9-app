-- v550 · Zweite Achse an der Vorlage: die Ordnung im Spiel
--
-- Die Leitfrage sagt, WORUM es geht. Sie sagt nicht, WIE die Mannschaft dabei steht.
-- „Wie kriege ich den Ball zu einem, der frei ist?" laesst sich als Ueberzahl 4 gegen 2
-- spielen oder als Dreieck 3 gegen 3 — das ist eine eigene Frage, und die Leitfragen
-- bilden sie nicht ab.
--
-- Bewusst NICHT „Schwerpunkt": das waere dieselbe Aussage wie die Leitfrage in einer
-- zweiten Sprache („Wie mache ich ein Tor?" IST Abschluss), und das Ausbildungskonzept
-- Fassung 3 hat sich unter „Leitfragen statt Schwerpunkte" ausdruecklich dagegen
-- entschieden.
--
-- Bewusst auch nicht „Spielform": das Wort ist in der App zweifach vergeben — die
-- Spielformen des Spieltags (4+1, 3+1, FUNiNO) und die Einordnung Spielform gegen
-- Uebungsform (v533). Ein drittes Mal waere die zweite Wahrheit.
--
-- Ein Text, keine Liste: eine Einheit steht in EINER Ordnung. NULL ist erlaubt und
-- heisst „keine besondere" — ein Torschuss-Wettbewerb hat keine.

alter table public.trainingsvorlagen
  add column if not exists ordnung text;

comment on column public.trainingsvorlagen.ordnung is
  'Wie die Mannschaft im Spiel steht: 1 gegen 1 · 2 gegen 2 · Dreieck (3 gegen 3) · Raute (4 gegen 4) · Ueberzahl · ohne Gegner. NULL = keine besondere.';

-- Die sieben vorhandenen Vorlagen einordnen -----------------------------------
-- Der Abgleich legt nur NEUE Zeilen an und ruehrt bestehende nie an; ohne diesen
-- Schritt bliebe die neue Kachelreihe bei allen sieben leer. Abgeleitet aus der
-- Uebung, die der Hauptteil nennt.
update public.trainingsvorlagen set ordnung = '1 gegen 1'            where name like 'L1-1%' and ordnung is null;
update public.trainingsvorlagen set ordnung = '1 gegen 1'            where name like 'L2-1%' and ordnung is null;
update public.trainingsvorlagen set ordnung = 'ohne Gegner'          where name like 'L3-1%' and ordnung is null;
update public.trainingsvorlagen set ordnung = 'Überzahl'             where name like 'L4-1%' and ordnung is null;
update public.trainingsvorlagen set ordnung = 'Dreieck (3 gegen 3)'  where name like 'L4-2%' and ordnung is null;
update public.trainingsvorlagen set ordnung = 'Dreieck (3 gegen 3)'  where name like 'L5-1%' and ordnung is null;
update public.trainingsvorlagen set ordnung = '2 gegen 2'            where name like 'L6-1%' and ordnung is null;
