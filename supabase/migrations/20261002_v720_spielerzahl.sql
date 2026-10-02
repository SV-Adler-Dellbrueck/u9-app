-- v720 (PO 02.10.): „jede Übungsform auf eine Anzahl an Spielern festlegen, sodass es einfacher wird,
-- eine Übung auszutauschen, weil Spieler fehlen“. Entschieden (Kachel): „Von–bis + Torwart“.
-- Kinder je Station von/bis (der Torwart zählt mit) und „mit Torwart“ als feste Felder. Der Text
-- „spieler“ bleibt als Beschreibung. Leer = die App liest den Text (tpSpielerAusText in boot.js).
alter table public.trainingsformen
  add column if not exists spieler_min int,
  add column if not exists spieler_max int,
  add column if not exists mit_torwart boolean;
alter table public.trainingsformen
  add constraint trainingsformen_spieler_spanne_chk
  check ((spieler_min is null and spieler_max is null)
      or (spieler_min between 1 and 30 and spieler_max between spieler_min and 30));
comment on column public.trainingsformen.spieler_min is 'v720: Kinder je Station, mindestens (Torwart zählt mit)';
comment on column public.trainingsformen.spieler_max is 'v720: Kinder je Station, höchstens – Wartende/Wechsler zählen hierher';
comment on column public.trainingsformen.mit_torwart is 'v720: Station braucht einen Torwart';

-- Einmalig vorbelegt aus dem Text (dieselbe Rechnung wie tpSpielerAusText). Offen gelassen und
-- zur Durchsicht: ids 2, 3, 4 (ohne Angabe), 57 („7 auf dem Feld …“), 70 („drei Paare …“).
update public.trainingsformen t set spieler_min=v.mn, spieler_max=v.mx, mit_torwart=v.tw from (values (5,4,4,false),(6,6,6,false),(7,8,14,false),(8,8,14,false),(9,8,14,false),(10,8,14,false),(11,9,15,true),(12,2,2,true),(13,4,4,false),(14,6,6,false),(15,4,4,false),(16,6,6,true),(27,6,6,false),(28,10,10,true),(29,6,6,false),(30,3,3,false),(45,6,6,true),(46,4,6,true),(47,6,6,true),(48,8,12,false),(49,6,6,true),(50,5,6,true),(51,6,6,false),(52,4,6,false),(53,6,6,false),(54,6,6,false),(55,6,6,false),(56,4,6,false),(58,4,6,true),(59,8,8,false),(60,8,8,false),(61,6,8,false),(62,8,14,false),(63,6,6,false),(64,6,6,false),(65,7,9,true),(66,6,8,true),(67,6,6,true),(68,4,6,false),(69,4,6,true),(71,6,14,false),(72,14,14,true),(73,8,14,false)) as v(id,mn,mx,tw) where t.id=v.id;
