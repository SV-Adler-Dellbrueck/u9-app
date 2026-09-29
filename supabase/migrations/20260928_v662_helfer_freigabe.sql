-- v662 · Helfer-Aufgaben nur auf Freigabe des Trainers
-- PO 28.09.: „hier sollte es nur eine Auswahl geben, wenn wir das in der Trainer-App freigeben
-- bzw. die Hilfe brauchen. Kann Aufbau und Abbau betreffen. Ebenso bei Spieltagen und Festivals.
-- Und auch andere Dinge könnten wir dort als Trainer eintragen.“
-- [{ "t": "🛠️ Aufbau", "n": 2 }, { "t": "📌 Kuchen fürs Fest", "n": 1 }] – t ist der Schlüssel in
-- event_helfer.aufgabe, n die Zahl der gebrauchten Helfer. null = nichts freigegeben.
alter table public.termine add column if not exists helfer_aufgaben jsonb
  check (helfer_aufgaben is null or (jsonb_typeof(helfer_aufgaben) = 'array' and jsonb_array_length(helfer_aufgaben) <= 12));
comment on column public.termine.helfer_aufgaben is
  'v662: vom Trainer freigegebene Helfer-Aufgaben [{t, n}] – nur diese sehen Eltern unter „Wer hilft mit?“.';
