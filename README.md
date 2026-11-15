<img src="public/logos/youpspace.png" alt="YoupSpace" height="40"> &nbsp; <img src="public/logos/space-apps.png" alt="NASA Space Apps Challenge" height="40">

# AstroNav – Health Monitoring for Astronauts

**NASA Space Apps Challenge 2026** · Challenge: *Create Health Monitoring Software for Astronauts on Space Missions*
Team AstroNav (solo) · Amsterdam (virtual) · by [YoupSpace](https://youpspace.com)

**This is the main repo of AstroNav.** It holds the desktop console and the hardware files (PCB and case). The watch firmware lives in its own repo.

AstroNav is a health station worn on the wrist plus a desktop console. The watch measures the astronaut's body and the cabin air and warns on the wrist, even without a laptop. The console receives everything over Bluetooth Low Energy and turns it into live values, trends and one clear next step, in the style of an ISS caution and warning panel.

| Where | What |
|---|---|
| **SpaceApps2026-AstroNav-Dashboard** (this repo) | Desktop console, PCB Gerbers, 3D printable case, project overview |
| [SpaceApps2026-AstroNav-Firmware](https://github.com/youptheking/SpaceApps2026-AstroNav-Firmware) | Watch firmware, BLE protocol, sensor and alarm documentation |

> Separate from the other AstroNav projects (AstroNav-Nano and related repos).

## Why I built this

Being part of space has been my dream since I was young. At home, space is what keeps me busy, for example building my own flight controllers for model rockets. When I saw this challenge, I knew I could make it something special by building a real wearable next to the software. I designed the PCB, milled it, soldered it and printed the case myself, all in one weekend. Not everything went to plan, and every setback is listed honestly below. I hope my work inspires others, so I am sharing everything openly: the firmware, the console and the hardware.

## Features

- **Connect and unlock** the watch with the 6-digit code on its screen, automatic reconnect
- **Caution & warning lamps** per parameter, with ISS-style classes. Mute the sound per lamp; the lamp stays lit.
- **Vitals:** live ECG trace, heart rate (ECG and optical), SpO2, HRV against a personal baseline, skin-temperature trend
- **Signal quality first:** optical values during movement or weak pulse are not shown as real, RR data is ignored when the ECG is poor, short dropouts hold the last good value
- **Cabin air:** 1-hour ppCO2 against the **NASA-STD-3001 limit of 3 mmHg** and the 2.5 mmHg target, pressure trend, temperature, humidity
- **Body map** with what changes in space and when to act, plus an ECG leads tab that opens by itself when an electrode comes loose
- **What to do:** the most urgent advice right now, sent to the wrist with one click
- **Event log** with who raised and who handled each alert
- **Simulated values are always labelled:** the watch says which values are simulated, the console marks them "Sim"
- **Demo mode:** a simulated watch on the laptop that sends the same packets and plays a 5-minute story (stress builds, CO2 rises, an electrode comes loose, the breathing break works)
- **Station time:** everything in GMT, like on board
- **NASA hazards:** the five hazards of NASA's Human Research Program, with what AstroNav monitors for each and the related HRP risks; radiation is honestly marked "Not measured"
- **7 days:** the watch stores a summary every minute; the console fetches it over BLE and shows hourly charts (heart rate, lowest SpO2, ppCO2 against the NASA limit, activity) and a table per day
- **Daily check-in:** sleep, mood, optional blood pressure and glucose, stored per crew member and day
- **Crew selector:** the real wrist station plus demo crew members on pretend watches
- **Dummy data is always marked:** a notice under the top bar says when the screen shows example values, a demo or a demo crew member

## Build your own watch

The schematic and PCB design are open on **OSHWLab**, where you can view them in the browser and copy the EasyEDA project: [https://oshwlab.com/youphoutkamp/project_ougymktu](https://oshwlab.com/youphoutkamp/project_ougymktu)

Everything you need to build the hardware is also in [`hardware/`](hardware/):

| File | What |
|---|---|
| [`hardware/pcb/AstroNav_Wrist_Gerber_File.zip`](hardware/pcb/AstroNav_Wrist_Gerber_File.zip) | Gerbers and drill file of the double-sided PCB (EasyEDA). Mill it yourself, as I did, or order it from any PCB maker. |
| [`hardware/case/AstroNav_Wrist_Holder.stl`](hardware/case/AstroNav_Wrist_Holder.stl) | 3D printable case (bottom part), with loops for a velcro strap |
| [`hardware/case/AstroNav_Wrist_Lid.stl`](hardware/case/AstroNav_Wrist_Lid.stl) | 3D printable lid, with the window for the display and the buzzer grille |

Print the case in PETG or PLA. Parts list, wiring and pinout: see the [firmware repo](https://github.com/youptheking/SpaceApps2026-AstroNav-Firmware) (`docs/inkooplijst.md`, `docs/pinout.md`, `docs/sensoren.md`).

**Known issues in this PCB revision,** fix them when you build one:

- The MAX30102 footprint does not match the module; I connected it with short wires.
- R5 and R6 (I2C pull-ups, 4.3–4.7 kΩ) must be fitted.
- The BH1750 footprint has the wrong pin order; the light sensor is left out.
- The battery connector and power switch are fragile; mine broke off, so my watch runs on USB.
- The design was drawn for a 0.91" OLED; I used a 0.96" display, turned 90°.

## Stack

Tauri 2 · Rust (`btleplug`) for BLE and packet parsing · React + TypeScript · Vite · Vitest

```
Wrist station (ESP32-S3)  --BLE-->  Rust backend (Tauri)  -->  React console
```

## Try it on Windows

Download **`AstroNav.Dashboard_0.1.0_x64-setup.exe`** from the [latest release](https://github.com/youptheking/SpaceApps2026-AstroNav-Dashboard/releases/latest) and run it. No watch? Turn on **Demo** in the top bar and the console plays a five minute scenario on simulated data.

The installer is not code signed, so Windows may show "Windows protected your PC". Click **More info**, then **Run anyway**.

## Run from source

```
npm install
npm run tauri dev
```

Tests: `npm test`. Without the watch, turn on **Demo** in the top bar.

## NASA resources

- **NASA-STD-3001 Vol. 2, Rev. F, [V2 6004]:** 1-hour average ppCO2 at or below 3 mmHg, shown as a limit line on the CO2 chart
- **[V2 6022]:** alert the crew locally and remotely; the console is the remote half, the watch the local half
- **[V2 6012]:** cabin temperature and humidity limits
- **NASA OCHMO technical briefs** (CO2, ECLSS, Behavioral Health) for the reasoning behind the limits and why stress is monitored

Physiological limits (SpO2, heart rate, stress) come from the WHO Pulse Oximetry Training Manual or are my own choice. The console gives advice, not a diagnosis.

## Limitations

- ECG heart rate is not yet reliable on my watch (small spikes every 150 ms); the ECG trace works, the optical heart rate is used
- The BMP180 on my watch gives impossible readings, so there is no cabin pressure or pressure trend on this unit
- One real wrist station; the other crew members are demo crew on pretend watches
- The check-in is stored on this laptop only
- No radiation sensor (CSA's CANS dosimeter is the logical next step)
- No blood-pressure trend (pulse transit time) yet; the watch already sends ECG and PPG on one clock

## Use of AI

Per the Space Apps rules, I disclose where AI ("SI") was used.

The idea and concept are my own. Claude (Anthropic) was used to research parts, look up limits in NASA-STD-3001, draft documentation, and write a significant portion of the code from my own design. PCB design, milling, soldering, the case and all testing on the real watch were done by hand.

## License

AstroNav is open source. You may use it, change it and share it, as long as you share your changes under the same license.

- **Software** (this console and the [firmware](https://github.com/youptheking/SpaceApps2026-AstroNav-Firmware)): [GPL-3.0](LICENSE)
- **Hardware** (PCB and case in [`hardware/`](hardware/) and [on OSHWLab](https://oshwlab.com/youphoutkamp/project_ougymktu)): [CERN-OHL-S v2](hardware/LICENSE)

The names AstroNav and YoupSpace and the logos are not covered by these licenses. Please don't present your own version under these names.

---

Made by [YoupSpace](https://youpspace.com) for NASA Space Apps 2026.
