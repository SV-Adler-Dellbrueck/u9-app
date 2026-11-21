-- v922 · Steckbrief für alle Kinder (Charles 21.11.: „ein paar mehr Informationen … Fotos vom Fußball, vom Sport,
-- aus dem Privatleben … Lieblingsposition, Hobbys, Lieblingsspieler … Fragen wie in einem Freundebuch … etwas
-- Kreatives … Dinge, auf die er stolz sein kann“; Fragenkatalog freigegeben, Lieblingsposition als Rauten-Position).
-- Neue freiwillige Textfelder in kind_fanfacts (Rechte unverändert: kf_rw – Trainer, Eltern des Kindes, das Kind
-- selbst). Bewusst nichts zu Schule, Wohnort, Geschwistern, Geburtsdatum oder Gesundheit. Die Sicherung liest
-- kind_fanfacts mit select=* und nimmt die Spalten mit.
alter table public.kind_fanfacts
  add column if not exists lieblingsposition text,
  add column if not exists schoenster_moment text,
  add column if not exists torjubel text,
  add column if not exists stolz_auf text,
  add column if not exists lieblingsfarbe text,
  add column if not exists lieblingsbuch text,
  add column if not exists lieblingsspiel text,
  add column if not exists lieblingsfach text,
  add column if not exists mag_nicht text,
  add column if not exists groesster_wunsch text,
  add column if not exists superkraft text,
  add column if not exists zaubern text,
  add column if not exists lieblingswitz text,
  add column if not exists geheimes_talent text,
  add column if not exists star_spielen text,
  add column if not exists traumstadion text,
  add column if not exists satz_an_team text;

-- Lieblingsposition: die Rauten-Positionen, dazu „alle“ und „alle außer Torwart“.
alter table public.kind_fanfacts drop constraint if exists kind_fanfacts_lieblingsposition_check;
alter table public.kind_fanfacts add constraint kind_fanfacts_lieblingsposition_check
  check (lieblingsposition is null or lieblingsposition in ('jaeger','flitzer_links','flitzer_rechts','aufpasser','torwart','alle','alle_ausser_tw'));

-- Fotos im Album: drei neue Zwecke für die Steckbrief-Kacheln (Beim Sport, Aus dem Alltag, Selbst gemalt);
-- „Beim Fußball“ nutzt den vorhandenen Zweck „aktion“.
alter table public.kind_foto drop constraint if exists kind_foto_zweck_check;
alter table public.kind_foto add constraint kind_foto_zweck_check
  check (zweck = any (array['portraet','aktion','jubel','team','frei','sport','alltag','gemalt']));
