# Rondje — Boerenbridge

Een Nederlandstalig scorebord, ontworpen voor telefoon en tablet. Statische HTML, CSS en JavaScript: geen buildstap, account of backend nodig.

## Gebruiken

1. Vul 2–12 unieke spelersnamen in, één per veld. Voeg spelers toe met **+ Speler toevoegen** en verwijder ze met **−**. Sleep aan **⠿** of gebruik de omhoog/omlaag-knoppen om de speelrichting aan tafel vast te leggen. De sleepgreep werkt ook met de pijltjestoetsen.
2. Kies **wie als eerste schudt** en het **maximum aantal kaarten** (1–50). Maximum 10 betekent **20 rondes: 1 → 10 → 10 → 1**. De schudbeurt schuift iedere ronde één plaats op. De speler na de schudder staat bovenaan de invoerlijst; de schudder staat als laatste.
3. Vul voorspelde slagen in met de knoppen of het toetsenbord. Ook **0** is een voorspelling; **—** betekent nog niet ingevuld. Elke speler mag maximaal het aantal beschikbare slagen voorspellen. Het gezamenlijke totaal mag **hoger of lager**, maar **niet gelijk** aan het aantal beschikbare slagen zijn. Dat is op de terugweg dus niet het rondenummer.
4. Boven de ronde zie je **beschikbare slagen, totaal voorspeld en het aantal ingevulde spelers**. Zodra de andere biedingen bekend zijn, verschijnt het verboden bod bij de laatste speler. De +/− knoppen slaan dat getal over; ongeldige toetsenbordinvoer geeft een melding en wordt als openstaand bewaard. Een tussentijds gelijk totaal is wel toegestaan.
5. Tik na de ronde op **Goed** voor **10 + 5 × voorspelde slagen**. Bij **Fout** vul je de volledige rondescore zelf in. Negatieve punten en nul zijn toegestaan; een lege score is nog open.
6. Rond de ronde af zodra alle voorspellingen geldig zijn en alle scores zijn ingevuld. Via de pijlen of rondenummers kun je eerdere rondes corrigeren. Totalen worden direct herberekend.
7. De puntenstap is standaard 5 en via het tandwiel instelbaar op elk geheel getal van 1–100. Voorspellingen veranderen per 1, met overslaan van een verboden bod.
8. Gebruik de **zon/maan-knop** bovenaan voor lichte of donkere modus. Bij het eerste bezoek volgt de pagina je apparaatinstelling; een eigen keuze wordt bewaard.

### Kaartenlimiet en animaties

Bij nieuwe spellen rekent Rondje met **52 kaarten**, zonder een aparte troefkaart te reserveren. Het maximum is `floor(52 / aantal spelers)`. Kies je een hoger maximum of voeg je meer spelers toe, dan wordt het maximum automatisch verlaagd met een melding. Met 6 spelers wordt maximum 10 bijvoorbeeld **8 kaarten en 16 rondes: 1 → 8 → 8 → 1**. Bij het verwijderen van spelers blijft je gekozen maximum staan. Bestaande spellen worden niet ingekort.

Bij scorewijzigingen bewegen de rondescore en het totaal kort mee en verschijnt een **+ / − puntenindicatie** naast de invoer. De werkelijke score verandert direct, ook bij snel herhaald tikken. Rondewissels, knoppen, spelersvelden en de einduitslag hebben subtiele animaties. De apparaatinstelling **minder beweging** schakelt deze effecten uit.

Namen, rondes en totalen blijven zichtbaar tijdens het scrollen in de tabel. Op kleine schermen kun je horizontaal schuiven voor meer spelers.

Het spel wordt opgeslagen in `localStorage`, op dit apparaat en voor dit websiteadres. Er is geen synchronisatie tussen apparaten. Het wissen van browsergegevens verwijdert ook het spel. Als opslaan niet lukt, meldt de pagina dat. Google Fonts wordt gebruikt voor de typografie, met lokale fallback-lettertypen.

**Bestaande spellen:** oude opgeslagen spellen worden ingelezen met behoud van scores, spelers en hun oorspronkelijke oplopende rondes. Kies bij de ronde wie oorspronkelijk begon met schudden. Het nieuwe heen-en-terugschema geldt voor nieuwe spellen. Bij het aanpassen van een oud spel gelden de nieuwe voorspellingsregels; de pagina markeert bestaande voorspellingen buiten de grenzen zonder de opgeslagen scores automatisch te wijzigen.

## Lokaal starten

Met Python 3:

```sh
python3 -m http.server 8888
```

Open **http://localhost:8888**. Gebruik een webserver: de JavaScript-modules werken niet via het rechtstreeks openen van `index.html` als bestand.

Met Node.js 18 of nieuwer kun je de berekening en opslagvalidatie controleren:

```sh
npm test
```

Er hoeven geen npm-pakketten geïnstalleerd te worden.

Voor de optionele browsercontrole (inclusief touch-slepen, darkmode, rondeverloop en migratie):

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node browser-check.mjs
```

De controle start en stopt zelf een tijdelijke server op poort 8879. De normale ontwikkelserver blijft op **8888** (`npm start`).

## Publiceren op GitHub Pages

1. Maak een GitHub-repository aan en upload de bestanden uit deze map naar de hoofdmap van de `main`-branch.
2. Ga naar **Settings → Pages**.
3. Kies bij **Build and deployment → Source** voor **Deploy from a branch**.
4. Kies branch **main**, map **/ (root)**, en klik **Save**.
5. GitHub toont na de publicatie de URL: `https://<gebruikersnaam>.github.io/<repository>/`.

Alle assetpaden zijn relatief, dus de pagina werkt ook onder een repository-subpad. `.nojekyll` schakelt Jekyll-verwerking uit. Publiceren vereist `index.html`, `style.css`, `app.js`, `scoring.js`, `setup.js`, `theme.js`, `motion.js`, `icon.svg` en `.nojekyll`; de overige bestanden zijn documentatie en tests. Upload `node_modules` niet.

## Handmatige controle

- Controleer op telefoon (375 px) en tablet (768 px) de horizontale tabelscroll, vaste namen/rondekolom en aanraakknoppen.
- Voorspel in een ronde met minimaal 3 slagen 0 en 3 slagen en vink Goed aan: respectievelijk 10 en 25 punten.
- Kies Fout, voer 0 en een negatieve score in, en controleer de totalen.
- Pas de puntenstap aan en wijzig een eerdere ronde.
- Herlaad: alle invoer en de geselecteerde ronde moeten terugkomen.
- Start een nieuw spel: annuleren behoudt het spel, bevestigen wist de scores.
- Versleep spelers met een vinger en controleer dat de geselecteerde eerste schudder dezelfde persoon blijft.
- Kies maximum 3: het schema moet 1, 2, 3, 3, 2, 1 zijn; controleer de schudrotatie en de bovenste speler.
- Bij 5 beschikbare slagen en 4 al voorspeld mag de laatste speler geen 1 bieden, maar wel 0 of 2–5.
- Wissel van thema en herlaad: de gekozen modus blijft behouden.
