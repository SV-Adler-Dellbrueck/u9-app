-- v552 · Der Bestand, wie er wirklich ist
--
-- Die Startliste aus v545 war ein Geruest aus dem, was ein U9-Team ueblicherweise hat.
-- Der PO hat sie am 14.09. am echten Schrank durchgesehen. Vier Zeilen stehen fuer
-- Dinge, die es bei uns nicht gibt:
--
--   Baelle Groesse 3        - wir spielen Groesse 4
--   Ballpumpe               - stellt der Verein, nicht das Team
--   Huetchen gruen          - haben wir nicht
--   Spielfeldmarkierung     - haben wir nicht
--
-- Geloescht statt auf aktiv=false gesetzt: eine Inventurliste soll zeigen, was wir
-- haben. Eine dauerhaft ausgeblendete Zeile waere Ballast, den niemand mehr sieht und
-- den trotzdem jeder mitschleppt. Kommen gruene Huetchen dazu, legt der Trainer sie
-- ueber "+" in zehn Sekunden wieder an.
--
-- Die Bedingung ist kein Schmuck: geloescht wird NUR, was nie gezaehlt wurde. Stuende
-- dort eine Zahl, waere sie eine Beobachtung vom Platz - die wirft man nicht weg, weil
-- eine Migration laeuft.
delete from public.material_posten
 where soll is null and ist is null and zuletzt_gezaehlt is null
   and (   (name = 'Bälle'      and variante = 'Größe 3')
        or (name = 'Ballpumpe'  and variante is null)
        or (name = 'Hütchen'    and variante = 'grün')
        or (name = 'Spielfeldmarkierung') );

-- Der Trikotsatz heisst wie sein Ausruester ---------------------------------------
-- Praesentationsanzug und Spieltagsjacke tragen "FRMD PASN" schon im Namen; der
-- Trikotsatz kommt aus derselben Reihe und heisst ab jetzt genauso. Der Name ist die
-- einzige Verbindung, die ein Mensch sieht - die Tabellen haengen an der id und
-- merken vom Umbenennen nichts.
--
-- NUR der Gegenstand im Katalog, nicht der Posten im Materialschrank: dort steht schon
-- "Spieltagsjacken" neben "Spieltagsjacke FRMD PASN". Der Schrank fuehrt Kurznamen, der
-- Katalog den vollen - beides zu mischen waere unuebersichtlicher als beides zu trennen.
update public.ausstattung_artikel
   set name = 'Trikotsatz FRMD PASN'
 where name = 'Trikotsatz';

-- Satznummer faellt weg ------------------------------------------------------------
-- Gedacht war sie fuer durchnummerierte Saetze (Nr. 1-14). Die Nummer am Kind ist die
-- Trikotnummer, und die steht im Kader - zwei Nummern an derselben Stelle sind eine zu
-- viel. Das Feld verschwindet damit aus der Ausgabezeile; die Spalte bleibt, weil ein
-- spaeter angelegter Gegenstand sie wieder brauchen kann.
update public.ausstattung_artikel
   set mit_nummer = false
 where name = 'Trikotsatz FRMD PASN';
