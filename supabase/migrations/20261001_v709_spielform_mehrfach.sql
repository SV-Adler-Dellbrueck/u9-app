-- v709 · Spielform mit Mehrfachwahl (seit v708 im Client: „funino,3+1“)
-- Die alte Regel termine_spielform_chk ließ nur EINE Form zu – Speichern scheiterte mit
-- „Speichern fehlgeschlagen“ (PO 01.10., Termin 03.10.). Neue Regel: eine oder mehrere der
-- vier Formen, kommagetrennt. Eingespielt am 01.10.2026.
alter table public.termine add constraint termine_spielform_liste_chk
  check (spielform is null or spielform ~ '^(funino|3\+1|4\+1|5\+1)(,(funino|3\+1|4\+1|5\+1))*$');
alter table public.termine drop constraint termine_spielform_chk;
