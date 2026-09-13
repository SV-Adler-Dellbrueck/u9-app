-- v530 · Eine Trikotnummer gehoert genau einem aktiven Kind
--
-- Auf `kader.nr` lag bisher KEINE Regel. Zwei Kinder mit derselben Nummer haette die
-- Datenbank klaglos angenommen, und der Kader-Editor pruefte es auch nicht - aufgefallen
-- waere es erst auf dem Platz, beim Wechsel oder im Spielbericht.
--
-- Warum ein aufschiebbarer, partieller AUSSCHLUSS und kein gewoehnlicher eindeutiger Index:
--
-- · PARTIELL (`where aktiv and nr is not null`): Ein ausgeschiedenes Kind darf seine alte
--   Nummer behalten, ohne sie fuer ein neues zu blockieren. Nummern werden in einer
--   Jugendmannschaft wiederverwendet. Ein UNIQUE-CONSTRAINT kann kein WHERE, ein
--   partieller UNIQUE-INDEX kann nicht aufschieben - der Ausschluss kann beides.
--
-- · AUFSCHIEBBAR (`deferrable initially deferred`): Der Kader-Editor speichert den ganzen
--   Kader in EINEM Upsert. Tauschen zwei Kinder ihre Nummern, ist mitten in dieser einen
--   Anweisung dieselbe Nummer kurz doppelt vergeben. Ein sofort geprueftes Merkmal haette
--   den Tausch abgelehnt, obwohl das Ergebnis einwandfrei ist. Geprueft wird deshalb erst
--   am Ende der Transaktion - und PostgREST fasst jede Anfrage in genau eine.
--
-- Nachgewiesen vor dem Anwenden: Tausch in einer Anweisung geht durch, ein inaktives Kind
-- mit derselben Nummer blockiert nicht, eine echte Dublette scheitert mit 23P01.
alter table public.kader drop constraint if exists kader_nr_aktiv_uniq;
alter table public.kader add constraint kader_nr_aktiv_uniq
  exclude using btree (nr with =) where (aktiv and nr is not null)
  deferrable initially deferred;
