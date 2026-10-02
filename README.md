# Kaartscores

Scoreblad voor **kleurenwiezen**, **chinees poepen** en **hartenjagen** op je gsm. Werkt ook zonder internet.

👉 **Open de app: <https://rslaus.github.io/card-scores/>**

## Installeren op je gsm

Je hoeft niets te downloaden uit een app store. Je zet de website op je beginscherm, en daarna opent hij als een gewone app (schermvullend, zonder adresbalk).

### Android (Chrome)

1. Open <https://rslaus.github.io/card-scores/> in **Chrome**.
2. Tik op het menu **⋮** rechtsboven.
3. Kies **App installeren** (of **Toevoegen aan startscherm**).
4. Bevestig met **Installeren**.

Het icoon met de twee kaarten staat nu op je startscherm.

### iPhone / iPad (Safari)

1. Open <https://rslaus.github.io/card-scores/> in **Safari**.
2. Tik op de **Deel**-knop (vierkantje met pijl omhoog, onderaan of bovenaan het scherm).
3. Scrol naar beneden en kies **Zet op beginscherm**.
4. Tik op **Voeg toe**.

> Op oudere iPhones (ouder dan iOS 16.4) werkt dit alleen vanuit Safari, niet vanuit Chrome of een andere browser.

### Offline gebruiken

Open de app **één keer met internet**. Daarna werkt hij ook zonder verbinding, bijvoorbeeld op café of op vakantie.

## Gebruik

1. Kies een spel en vul de namen in **volgens zitvolgorde** (met de klok mee). Speler 1 deelt eerst.
   - Kleurenwiezen: precies 4 spelers. Kies vooraf hoeveel rondes je speelt.
   - Chinees poepen: 2 of meer spelers. Het aantal rondes volgt uit het aantal spelers (1 kaart → maximum → 1 kaart).
   - Hartenjagen: precies 4 spelers. Kies tot hoeveel strafpunten je speelt (50, 100 of 200).
2. Tik na elke ronde op **+ Ronde invoeren**.
   - **Kleurenwiezen:** kies het contract, wie er speelt, het bod, de troef (optioneel) en hoeveel slagen er gehaald zijn. De app rekent de punten uit en toont ze vóór je opslaat. Bij een **rondje pas** telt de volgende ronde dubbel.
   - **Chinees poepen:** geef per speler in hoeveel slagen gevraagd en gehaald zijn.
   - **Hartenjagen:** geef per speler in hoeveel harten die haalde en duid aan wie de schoppenvrouw kreeg. Haalt iemand alles, dan krijgen de anderen elk 26 strafpunten. De app toont ook naar wie je kaarten doorgeeft.
3. Een fout gemaakt? Tik op **Ongedaan** of **Bewerken**, of tik op eender welke ronde in de lijst om ze aan te passen.
4. Na de laatste ronde toont de app automatisch de winnaar. Bij hartenjagen stopt het spel zodra iemand de limiet bereikt, en wint wie de **minste** strafpunten heeft.

Rechtsboven wissel je tussen donkere en lichte modus.

## Goed om te weten

- **Je scores staan alleen op je eigen toestel.** Ze worden niet gedeeld met andere gsm's en niet naar internet gestuurd. Eén persoon houdt dus de score bij.
- Als je de browsergegevens of websitegegevens wist, ben je je opgeslagen spellen kwijt.
- Een spel dat bezig is, blijft bewaard. Sluit je de app, dan ga je later verder waar je was.
- **Updates** komen vanzelf: open de app eens met internet, en de volgende keer dat je hem opent heb je de nieuwe versie.

## Spelregels

De puntentelling volgt deze regels:

- [Kleurenwiezen](kleurenwiezen-regels.md) (volgens Whisthub)
- [Chinees poepen](chinees-poepen-rules.md)
- [Hartenjagen](hartenjagen-regels.md) (volgens Whisthub)

---

## Voor ontwikkelaars

Gewone HTML/CSS/JS, geen frameworks en geen build-stap.

```sh
python3 -m http.server 8000      # open http://localhost:8000
node --test tests/*.test.mjs     # tests van de puntentelling
```

- `js/wiezen.js`, `js/poepen.js` en `js/harten.js`: puntentelling (los van de DOM, getest in `tests/`)
- `js/app.js`: schermen, opslag (localStorage) en navigatie
- `sw.js`: service worker voor offline gebruik. **Verhoog `CACHE_VERSION`** bij elke wijziging, anders blijven geïnstalleerde apps de oude versie gebruiken.

De site wordt gepubliceerd via GitHub Pages vanaf de `master`-branch.
