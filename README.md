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
| SCD41 | Cabine-CO2 (tot 5000 ppm gespecificeerd), temperatuur, luchtvochtigheid |

## Functies (gepland)

- **Realtime grafieken** van alle vitale functies en omgevingswaarden
- **Gezondheidstrends** over langere tijd: slaap, stress, temperatuur, activiteit
- **Beslissingspaneel** met concrete acties voor de astronaut, zoals rust nemen, ademhalingstraining starten of reageren op verhoogde CO2
