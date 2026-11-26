# B3 VM – Download-Seite

Die Seite hinter **[b3-f.de/vm](https://b3-f.de/vm)** (→ https://mamrehn.github.io/b3_vm_download/). Gebaut wird
die VM in [b3_vm_config](https://github.com/mamrehn/b3_vm_config); die Willkommensseite in der VM verlinkt hierher.

Die Seite nennt bewusst keine Versionsnummer, keinen Dateinamen und keine Prüfsumme: Eine neue VM-Version
braucht keine Änderung hier, nur die neue *.ova auf den Download-Quellen.

| Datei | Zweck |
|---|---|
| `index.html` | Startseite: Schritt 1 Herunterladen (zufällige Quelle, andere Quellen aufklappbar), Schritt 2 Link zur Anleitung |
| `vm-installationsanleitung.html` | Anleitung: Voraussetzungen in einem Satz, vier Schritte, Gut zu wissen |
| `hilfe.html` | Hilfe bei Problemen, aufklappbar (Gerät, VT-x, Schildkröte, 8 GB RAM, Import, Anzeige, Austauschordner, alte VM) |
| `app.js` | Hinweis für Geräte, auf denen die VM nicht läuft (Handy, Chromebook, Mac mit Apple-Chip, Windows auf ARM); zufällige Download-Quelle |
| `app.css` | das Wenige, das der Styleguide nicht hat (nur Tokens) |
| `style.css`, `b3.js`, `fonts/` | [B3-Styleguide](https://github.com/mamrehn/b3_it_styleguide_for_webapps) 6.5, **unverändert** kopiert; bei einem neuen Styleguide ganze Dateien ersetzen |
| `.github/workflows/pages.yml` | veröffentlicht die Seite bei jedem Push auf `main` über GitHub Actions |

**Download-Quellen ändern:** die Liste in `index.html` unter „Andere Download-Quelle wählen“. Quellen mit
`data-auto` wählt „VM herunterladen“ zufällig aus; `data-password` zeigt im Dialog das Passwort zum Kopieren, `data-hinweis` einen Satz dazu (z. B. Anmeldung mit dem Schulkonto).

**Lokal ansehen:** `python3 -m http.server 8000 --bind 127.0.0.1`, dann http://127.0.0.1:8000/
