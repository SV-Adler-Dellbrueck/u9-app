# kind-kopplung

Bindet ein Kindergerät an ein Kind. Aufruf aus der Kinder-App, nachdem sie sich anonym
angemeldet hat.

```
POST /functions/v1/kind-kopplung
Authorization: Bearer <Ausweis der anonymen Sitzung>
{ "code": "123456" }
```

Antwort wie `kind_status()` in der Datenbank: `ok`, `spieler_id`, `name`, `nr`, `tw`,
`geraet`, `limit_min`, `rest_min`. Bei einem Fehler `{ ok: false, fehler: "…" }` mit
einem Satz, der einem Kind vorgelesen werden kann.

## Warum mit Dienstschlüssel

Zum Einlösen muss die Zeile der Eltern in `kind_kopplung` gelesen werden — sie gehört dem
Kind nicht. Mit dem Dienstschlüssel geht das, ohne die Row-Level-Security dafür zu öffnen.
Der Schlüssel steht in den Secrets der Plattform, nie im Repo.

## Was die Funktion erzwingt

- **Nur anonyme Sitzungen.** Ein angemeldetes Elternteil, das den Code in die eigene App
  tippt, würde sich sonst zum Kindergerät machen und dabei Rechte verlieren.
- **Fünf Fehlversuche je Gerät und Stunde** (`kind_kopplung_versuch`). Ein sechsstelliger
  Code hat eine Million Möglichkeiten; ohne Deckel wäre er in Stunden geraten.
- **Verbrauchte Codes bleiben verbraucht**, auch wenn sie stimmen: abgelaufen oder schon
  eingelöst zählt nicht.
- **Zweiter Aufruf mit bestehender Kopplung** gibt einfach den Stand zurück, ohne Code —
  so übersteht die App einen Neustart.

## Deployment

`supabase functions deploy kind-kopplung` oder über den Supabase-MCP. Der Quelltext liegt
seit Beginn im Repo, damit Änderungen im Pull Request lesbar sind.
