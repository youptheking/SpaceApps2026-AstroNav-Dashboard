# NASA Space Apps 2026 – Team AstroNav – Desktopdashboard

> **Status: nog niet gestart.** De ontwikkeling begint op zaterdag 14 november 2026 om 09:00 (NL-tijd).
> Deze repo bevat bewust alleen projectinformatie. Er staat nog geen code in.

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

## Stack (gepland)

- **Tauri 2:** desktop-applicatieframework
- **Rust:** backend, BLE-verbinding en het verwerken van datapakketten
- **React:** frontend, met grafieken en het beslissingspaneel

## Datastroom

```
Polsstation (ESP32)  --BLE-->  Rust-backend (Tauri)  -->  React-UI
   sensoren uitlezen             pakketten ontvangen         realtime grafieken
   lokale alarmen                en verwerken                trends
                                                             beslissingspaneel
```

## Binnenkomende data

| Bron | Meting |
|---|---|
| MAX30102 / MAX86141 | Hartslag, SpO2 |
| MAX30102 (ingebouwde sensor) | Trend van de huidtemperatuur (afwijking van de baseline, geen absolute koortswaarde) |
| ICM45686 / MPU6050 | Beweging, activiteit, slaap, tremoren |
| GSR / AD8232 | Huidgeleiding (stress), ECG-hartgolf |
| BH1750 | Omgevingslicht (circadiaans ritme, slaap) |
| SCD41 | Cabine-CO2 (tot 5000 ppm gespecificeerd), temperatuur, luchtvochtigheid |

## Functies (gepland)

- **NASA-STD-3001 als referentie:** de CO2-grafiek toont de limiet van 3 mmHg (1-uursgemiddelde, requirement V2 6004) en het doel van 2,5 mmHg voor de lange termijn als referentielijnen. Details en bronnen: `docs/nasa-std-3001.md` in de zusterrepo SpaceApps2026-AstroNav-Firmware.

- **Realtime grafieken** van alle vitale functies en omgevingswaarden
- **Gezondheidstrends** over langere tijd: slaap, stress, temperatuur, activiteit
- **Beslissingspaneel** met concrete acties voor de astronaut, zoals rust nemen, ademhalingstraining starten of reageren op verhoogde CO2

## Gebruik van AI (SI)

Volgens de regels van NASA Space Apps vermelden we waar AI-tools ("Super Intelligence", SI) zijn gebruikt.

- **Idee en concept:** eigen werk. Het concept met polsstation en dashboard, en de keuze voor de challenge, stonden vast vóór er AI werd gebruikt.
- **Voorbereiding met Claude (Anthropic):** onderzoek naar leverbare onderdelen, de stroom- en pinberekeningen het opzoeken van de grenswaarden in NASA-STD-3001, de planning voor het weekend (`docs/todo.md`) en de eerste versies van de documenten in `docs/` (inkooplijst, ontwerpkeuzes, stroombudget, pinout, PCB-overzicht). De ontwerpbeslissingen zijn door de maker genomen en gecontroleerd.
- **Code:** waar code met AI-hulp is geschreven, staat dat in de commitbeschrijving en in een opmerking in het betreffende bestand.
