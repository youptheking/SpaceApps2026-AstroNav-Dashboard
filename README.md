# NASA Space Apps 2026 – Team AstroNav – Desktopdashboard

> **Status: dashboard werkt** met het echte horloge via Bluetooth, met een demohorloge op de laptop, en als browservoorbeeld met voorbeelddata. Zie [Wat werkt](#wat-werkt).
>
> Starten: `npm install` en dan `npm run tauri dev` (desktopapp met Bluetooth) of `npm run dev` (alleen de interface in de browser).

> Dit is een **NASA Space Apps Challenge 2026**-project en staat los van de andere AstroNav-projecten (AstroNav-Nano en verwante repos).

Zusterrepo: **SpaceApps2026-AstroNav-Firmware** (het polsstation)

---

## Deelname

| | |
|---|---|
| Teamnaam | Team AstroNav |
| Deelnamevorm | Solo |
| Locatie inschrijving | Amsterdam (virtueel evenement) |

## Tijdlijn

| Moment | Datum en tijd (NL) |
|---|---|
| Start | Zaterdag 14 november 2026, 09:00 |
| Inleverdeadline | Zondag 15 november 2026, 23:59 |

## Challenge

**Create Health Monitoring Software for Astronauts on Space Missions**

Langdurige ruimtemissies brengen risico's met zich mee: straling, isolatie, gewichtloosheid, veranderingen in het immuunsysteem, spieratrofie, belasting van hart en bloedvaten, en stress. Astronauten moeten hun eigen gezondheid kunnen bewaken en direct kunnen ingrijpen.

## Oplossing

Een samenhangend systeem met twee delen:

1. **Polsstation:** een ESP32-sensorstation dat je om de pols draagt (gefreesde PCB en 3D-geprinte behuizing). Het meet lichaam en cabine, geeft lokaal waarschuwingen via OLED en buzzer, en stuurt telemetrie via Bluetooth Low Energy.
2. **Desktopdashboard (deze repo):** een laptopapp die de telemetrie ontvangt en omzet in overzicht en actie.

## Stack

- **Tauri 2:** desktop-applicatieframework
- **Rust:** BLE-verbinding (`btleplug`), pakketten uitlezen volgens het protocol (`src-tauri/src/protocol.rs`, `ble.rs`)
- **React + TypeScript + Vite:** de interface, met eigen grafieken (geen grafiekbibliotheek)
- **Vitest + Testing Library:** tests voor de pakketverwerking, signaalkwaliteit, demo en interface

## Datastroom

```
Polsstation (ESP32)  --BLE-->  Rust-backend (Tauri)  -->  React-UI
   sensoren uitlezen             pakketten ontvangen         realtime grafieken
   lokale alarmen                en verwerken                trends
                                                             beslissingspaneel
```

## BLE-protocol

Het binaire pakketformaat (service, characteristics, pakkettypes, schaalfactoren) staat in `docs/ble-protocol.md` in de zusterrepo SpaceApps2026-AstroNav-Firmware. Firmware en dashboard volgen allebei dat document.

## Binnenkomende data

| Bron | Meting |
|---|---|
| MAX30102 | Hartslag, SpO2, perfusie, PPG-golf, trend van de huidtemperatuur |
| AD8232 | ECG-golf (250 Hz), RR-intervallen, elektrode los |
| MPU-6050 | Activiteit, tremor, schok, dubbeltik |
| GSR | Huidgeleiding (stress) |
| SCD41 | Cabine-CO2, temperatuur, luchtvochtigheid |
| BMP180 | Cabinedruk en de trend (lekdetectie) |
| ~~BH1750~~ | Geschrapt tijdens de bouw (zie de firmware-repo) |

## Wat werkt

Een Engels overzicht van het hele systeem (voor de projectpagina) staat in `docs/status.md` in de firmware-repo.

Eén scherm, opgezet als een consolescherm zoals aan boord van een ruimtestation.

| Onderdeel | Wat het doet |
|---|---|
| **Verbinden** | Zoekt het horloge (`AstroNav-Wrist`) en ontgrendelt het met de 6-cijferige code van het OLED. De code wordt onthouden. Valt het signaal weg, dan maakt de app vanzelf opnieuw verbinding en houdt hij de geschiedenis van de sessie vast. |
| **Caution & Warning-lampen** (bovenaan) | Eén lamp per parameter: ppCO2, cabinedruk, SpO2, hartslag, stress, ECG-elektrodes, huidcontact, schok, klimaat, accu, verbinding. Kleur volgens de ISS-klassen (advisory, caution, warning, emergency). Klik opent het logboek. |
| **Alarmgeluid per lamp** (rechtsonder) | Per lamp de buzzer op het horloge dempen. Een gedempte lamp blijft branden, knippert niet meer en krijgt een luidsprekericoon. Nieuwe alarmen op die lamp worden op het horloge stilgezet, maar blijven open in het logboek. De keuze wordt onthouden. |
| **Vitals** | Live ECG-golf (50 Hz-brom eruit gefilterd), hartslag (ECG en optisch), SpO2, perfusie, HRV ten opzichte van de eigen baseline, huidtemperatuurtrend, accu. |
| **Signaalkwaliteit** | Optische waarden bij beweging, zonder huidcontact of met een zwakke puls worden niet als echt getoond. Een korte uitval (tot 8 s) laat de laatste goede waarde grijs staan ("Holding last reading"). Een ECG die afgekapt of vlak is, wordt gemarkeerd en zijn RR-intervallen tellen niet mee voor HRV. |
| **Lichaam** | Status per lichaamssysteem (brein en stress, hart, longen en zuurstof, huid en temperatuur, spieren en botten) met uitleg wat er in de ruimte verandert en wanneer je moet handelen. Plus een scherm waar de ECG-elektrodes op de borst horen. |
| **Cabinelucht** | ppCO2 als 1-uursgemiddelde tegen de **NASA-STD-3001-grens van 3 mmHg** (V2 6004), actuele ppCO2, CO2 in ppm, cabinedruk en de trend (lekdetectie), temperatuur, luchtvochtigheid. |
| **Wat te doen** | Het belangrijkste advies op dit moment (lek, zuurstof, CO2, stress, elektrode los), met één knop om het als melding naar het horloge te sturen (`control` 0x04). |
| **HRV vandaag** | HRV per minuut tegen de eigen baseline, met het moment waarop de stresstrend begon. |
| **Logboek** | Alle alarmen van vandaag, wie ze gaf (pols, dashboard, astronaut) en hoe ze zijn afgehandeld. Afhandelen zet de buzzer op het horloge uit. |
| **Demo** | Een demohorloge op de laptop dat dezelfde pakketten stuurt als het echte horloge, met een verhaal van 5 minuten: stress bouwt op, CO2 loopt op, een elektrode laat los, en alles herstelt. Waarden die het echte horloge in de demomodus simuleert, staan gemarkeerd als **Sim**. |
| **Link** | youpspace.com rechtsonder, opent in de browser. |

## Wat nog niet werkt of voorbeelddata is

| Wat | Stand |
|---|---|
| **Check-in** (slaap, stemming, bloeddruk, glucose) en de **crewnaam** | **Voorbeelddata.** Er is nog geen invoer; het horloge meet dit niet. |
| **7 dagen geschiedenis van het horloge** ophalen | Het horloge slaat het op, het dashboard haalt het nog niet op. Trends beginnen bij het verbinden. |
| **PTT** (bloeddruktrend uit ECG + PPG) | Niet gebouwd. De ruwe ECG en PPG komen wel binnen met dezelfde klok. |
| **Lichtsensor** | Geschrapt in de hardware (zie de firmware-repo). |
| **Rust-kant** van de link naar youpspace.com (`tauri-plugin-opener`) | Toegevoegd, maar nog niet gebouwd en getest op een pc. |

## Testen

```
npm test          # 44 tests: pakketten, signaalkwaliteit, demo, interface, mute
npm run typecheck
npm run lint
cd src-tauri && cargo test   # protocol-parser
```

## Gebruik van AI (SI)

Volgens de regels van NASA Space Apps vermelden we waar AI-tools ("Super Intelligence", SI) zijn gebruikt.

- **Idee en concept:** eigen werk. Het concept met polsstation en dashboard, en de keuze voor de challenge, stonden vast vóór er AI werd gebruikt.
- **Voorbereiding met Claude (Anthropic):** onderzoek naar leverbare onderdelen, de stroom- en pinberekeningen het opzoeken van de grenswaarden in NASA-STD-3001, de planning voor het weekend (`docs/todo.md`) en de eerste versies van de documenten in `docs/` (inkooplijst, ontwerpkeuzes, stroombudget, pinout, PCB-overzicht). De ontwerpbeslissingen zijn door de maker genomen en gecontroleerd.
- **Code:** het dashboard is grotendeels met Claude geschreven op basis van ons eigen ontwerp: de indeling, de beslislogica, de grenswaarden (NASA-STD-3001 en WHO) en het BLE-protocol zijn door ons bepaald, en alles is getest met de eigen hardware. Waar code met AI-hulp is geschreven, staat dat in de commitbeschrijving.
