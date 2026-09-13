-- Paket 3: Übungsform gegen Spielform (doku/auftrag-adler-luecken, „Kleinigkeit").
--
-- Das Auftragspaket schlug einen zusätzlichen BLOCKTYP im Trainingsplan vor („uebung"
-- neben „main"). Die Prüfung am gerenderten Plan hat gezeigt, dass der Plan das heute
-- nicht tragen kann: ein Block mit unbekanntem Typ wird zwar gezeichnet, aber
-- tpSlotsMitZuordnung() speichert seine Trainerzuordnung nicht, während
-- tpPlanEntries() die Übung trotzdem einem Trainer zurechnet. Nach dem Neuladen
-- stünde der Block ohne Trainer da, die Statistik hätte aber schon gebucht.
--
-- Die Unterscheidung gehört ohnehin nicht an den Block, sondern an die ÜBUNG:
-- „Spielform heißt, das Kind entscheidet selbst" ist eine Eigenschaft der Übung,
-- unabhängig davon, in welchem Block sie läuft.
--
-- Gespeichert wird sie wie die ⭐-Schwierigkeit: als Overlay in team_config, mit dem
-- ÜBUNGSNAMEN als Schlüssel. Nur so sind auch die fest eingebauten Übungen aus
-- data.js erfasst – eine Spalte an `trainingsformen` würde nur die eigenen treffen
-- und wäre für den Rest eine zweite, leere Wahrheit.
--
-- Werte: "spiel" | "uebung". Ein fehlender Schlüssel heißt „noch nicht eingeordnet"
-- und wird NICHT geraten – eine plausibel aussehende falsche Einordnung wäre
-- schlimmer als gar keine.

alter table public.team_config
  add column if not exists uebung_art jsonb not null default '{}'::jsonb;

comment on column public.team_config.uebung_art is
  'Übungsname → "spiel" | "uebung". Overlay wie uebung_meta (⭐), damit auch die fest eingebauten Übungen erfasst sind. Fehlender Schlüssel = noch nicht eingeordnet.';
