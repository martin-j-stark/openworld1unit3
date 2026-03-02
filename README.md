# Unit 3 – Online Lernprogramm

## Start
Am zuverlässigsten läuft es über einen kleinen lokalen Webserver (damit `fetch()` funktioniert):

- **Mac/Windows**: Terminal im Ordner → `python -m http.server 8000`
- Dann öffnen: `http://localhost:8000`

## Inhalte einfügen
1. Screenshots/Fotos in `assets/` ablegen.
2. Inhalte in `data/unit3.json` eintragen:
   - topics → sections → theory/vocab/tasks

## Aufgabentypen
- mcq, truefalse, fill, match

## Tipp
Wenn du mir die Fotos hier hochlädst, kann ich `unit3.json` mit allen Lerninhalten der Unit 3 für dich befüllen.


## GitHub Pages
1. Neues Repo erstellen (Public oder Private mit Pages-Unterstützung)
2. ZIP-Inhalt ins Repo-Root kopieren (index.html liegt im Root)
3. GitHub → Settings → Pages → Deploy from branch: main / /(root)
4. URL öffnen – fertig.


## Neue Features
- **Drag & Drop Reihenfolge-Aufgaben**: Aufgabentyp `order`
- **Aussprache (TTS)**: 🔊 nutzt die Browser-Sprachausgabe (Web Speech API)
