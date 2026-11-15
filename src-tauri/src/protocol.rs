//! Parser for the AstroNav BLE protocol v1, see docs/ble-protocol.md in the firmware repo.
//! Scaled integers become physical units here, and the "invalid" markers become None.

use serde::Serialize;

pub const VERSION: u8 = 1;
pub const HEADER_LEN: usize = 8;

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Header {
    pub seq: u16,
    pub t_ms: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum Packet {
    Ecg { header: Header, mv: Vec<u16> },
    Ppg { header: Header, red: Vec<u32>, ir: Vec<u32> },
    Imu { header: Header, samples: Vec<[i16; 6]> },
    Gsr { header: Header, nanosiemens: Vec<u16> },
    Vitals {
        header: Header,
        hr_ppg: Option<u8>,
        hr_ecg: Option<u8>,
        spo2: Option<u8>,
        perfusion: Option<f32>,
        skin_temp: Option<f32>,
        activity: Option<u8>,
        tremor_hz: Option<f32>,
        tremor_amp: Option<u8>,
        skin_contact: bool,
        motion_artifact: bool,
        leads_off: bool,
        shock: bool,
    },
    Rr { header: Header, intervals_ms: Vec<u16> },
    Air {
        header: Header,
        co2_ppm: Option<u16>,
        temp_c: Option<f32>,
        humidity: Option<f32>,
        ppco2: Option<f32>,
        ppco2_hour: Option<f32>,
        nasa_status: Option<u8>,
    },
    Cabin {
        header: Header,
        pressure_pa: Option<u32>,
        pressure_trend: Option<i16>,
        lux: Option<f32>,
    },
    Status {
        header: Header,
        battery_mv: Option<u16>,
        battery_pct: Option<u8>,
        sensors_ok: u8,
        alarms: u16,
        firmware: [u8; 2],
    },
    Sim { header: Header, demo: bool, simulated: u8, battery_simulated: bool },
    Event { header: Header, code: u8, active: bool, severity: u8, value: i16, source: u8 },
}

#[derive(Debug, PartialEq, Eq)]
pub enum ParseError {
    TooShort { kind: u8, len: usize },
    Version(u8),
    UnknownType(u8),
}

impl std::fmt::Display for ParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ParseError::TooShort { kind, len } => write!(f, "packet 0x{kind:02x} too short ({len} bytes)"),
            ParseError::Version(v) => write!(f, "protocol version {v} is not supported"),
            ParseError::UnknownType(t) => write!(f, "unknown packet type 0x{t:02x}"),
        }
    }
}

struct Reader<'a> {
    buf: &'a [u8],
    pos: usize,
}

impl<'a> Reader<'a> {
    fn new(buf: &'a [u8]) -> Self {
        Self { buf, pos: HEADER_LEN }
    }
    fn at(buf: &'a [u8], pos: usize) -> Self {
        Self { buf, pos }
    }
    fn u8(&mut self) -> u8 {
        let v = self.buf[self.pos];
        self.pos += 1;
        v
    }
    fn u16(&mut self) -> u16 {
        let v = u16::from_le_bytes([self.buf[self.pos], self.buf[self.pos + 1]]);
        self.pos += 2;
        v
    }
    fn i16(&mut self) -> i16 {
        self.u16() as i16
    }
    fn u32(&mut self) -> u32 {
        let b = &self.buf[self.pos..self.pos + 4];
        self.pos += 4;
        u32::from_le_bytes([b[0], b[1], b[2], b[3]])
    }
}

fn nonzero(v: u8) -> Option<u8> {
    (v != 0).then_some(v)
}

fn valid_u8(v: u8) -> Option<u8> {
    (v != u8::MAX).then_some(v)
}

fn valid_u16(v: u16) -> Option<u16> {
    (v != u16::MAX).then_some(v)
}

fn valid_i16(v: i16) -> Option<i16> {
    (v != i16::MAX).then_some(v)
}

fn valid_u32(v: u32) -> Option<u32> {
    (v != u32::MAX).then_some(v)
}

fn expected_len(kind: u8) -> Option<usize> {
    Some(match kind {
        0x01 => 58,
        0x02 => 88,
        0x03 => 68,
        0x04 => 28,
        0x05 => 20,
        0x06 => 9,
        0x07 => 21,
        0x08 => 20,
        0x09 => 16,
        0x0A => 11,
        0x20 => 14,
        _ => return None,
    })
}

pub fn parse(buf: &[u8]) -> Result<Packet, ParseError> {
    let kind = *buf.first().ok_or(ParseError::TooShort { kind: 0, len: 0 })?;
    let min = expected_len(kind).ok_or(ParseError::UnknownType(kind))?;
    if buf.len() < min {
        return Err(ParseError::TooShort { kind, len: buf.len() });
    }
    if buf[1] != VERSION {
        return Err(ParseError::Version(buf[1]));
    }
    let header = Header {
        seq: u16::from_le_bytes([buf[2], buf[3]]),
        t_ms: u32::from_le_bytes([buf[4], buf[5], buf[6], buf[7]]),
    };
    let mut r = Reader::new(buf);

    Ok(match kind {
        0x01 => Packet::Ecg { header, mv: (0..25).map(|_| r.u16()).collect() },
        0x02 => {
            let red = (0..10).map(|_| r.u32()).collect();
            let ir = (0..10).map(|_| r.u32()).collect();
            Packet::Ppg { header, red, ir }
        }
        0x03 => Packet::Imu {
            header,
            samples: (0..5).map(|_| [r.i16(), r.i16(), r.i16(), r.i16(), r.i16(), r.i16()]).collect(),
        },
        0x04 => Packet::Gsr { header, nanosiemens: (0..10).map(|_| r.u16()).collect() },
        0x05 => {
            let hr_ppg = nonzero(r.u8());
            let hr_ecg = nonzero(r.u8());
            let spo2 = nonzero(r.u8());
            let perfusion = valid_u8(r.u8()).map(|v| v as f32 / 10.0);
            let skin_temp = valid_i16(r.i16()).map(|v| v as f32 / 100.0);
            let activity = valid_u8(r.u8());
            let tremor_hz = valid_u8(r.u8()).map(|v| v as f32 / 10.0);
            let tremor_amp = valid_u8(r.u8());
            let flags = r.u8();
            Packet::Vitals {
                header,
                hr_ppg,
                hr_ecg,
                spo2,
                perfusion,
                skin_temp,
                activity,
                tremor_hz,
                tremor_amp,
                skin_contact: flags & 0x01 != 0,
                motion_artifact: flags & 0x02 != 0,
                leads_off: flags & 0x04 != 0,
                shock: flags & 0x08 != 0,
            }
        }
        0x06 => {
            // variable length: count, then count u16 intervals
            let count = (r.u8() as usize).min(5);
            if buf.len() < 9 + count * 2 {
                return Err(ParseError::TooShort { kind, len: buf.len() });
            }
            Packet::Rr { header, intervals_ms: (0..count).map(|_| r.u16()).collect() }
        }
        0x07 => Packet::Air {
            header,
            co2_ppm: valid_u16(r.u16()),
            temp_c: valid_i16(r.i16()).map(|v| v as f32 / 100.0),
            humidity: valid_u16(r.u16()).map(|v| v as f32 / 100.0),
            ppco2: valid_u16(r.u16()).map(|v| v as f32 / 100.0),
            ppco2_hour: valid_u16(r.u16()).map(|v| v as f32 / 100.0),
            nasa_status: valid_u8(r.u8()),
        },
        0x08 => Packet::Cabin {
            header,
            pressure_pa: valid_u32(r.u32()),
            pressure_trend: valid_i16(r.i16()),
            lux: valid_u32(r.u32()).map(|v| v as f32 / 10.0),
        },
        0x09 => Packet::Status {
            header,
            battery_mv: valid_u16(r.u16()),
            battery_pct: valid_u8(r.u8()),
            sensors_ok: r.u8(),
            alarms: r.u16(),
            firmware: [r.u8(), r.u8()],
        },
        0x0A => {
            let demo = r.u8() != 0;
            let simulated = r.u8();
            let extra = r.u8();
            Packet::Sim { header, demo, simulated, battery_simulated: extra & 0x01 != 0 }
        }
        0x20 => Packet::Event {
            header,
            code: r.u8(),
            active: r.u8() != 0,
            severity: r.u8(),
            value: r.i16(),
            source: r.u8(),
        },
        _ => unreachable!("checked by expected_len"),
    })
}

// ---- history (extension on v1, characteristic `history`) ----
// Minute summaries the watch keeps in flash for 7 days, NASA-STD-3001 [V2 6001].

pub const HISTORY_RECORD_LEN: usize = 58;
const HISTORY_RECORD_VERSION: u8 = 2;

/// One minute on the watch. Raw values; `flags` says which ones were measured that minute.
#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryRecord {
    pub seq: u32,
    pub unix_time: u32,
    pub flags: u8,
    pub status: u8,
    pub alerts: u16,
    pub hr_avg: u8,
    pub hr_min: u8,
    pub hr_max: u8,
    pub spo2_avg: u8,
    pub spo2_min: u8,
    /// 0.01 °C
    pub skin_temp: i16,
    /// ppm, one per 5 seconds
    pub co2: Vec<u16>,
    /// 0.01 mmHg, 1-hour average at the end of the minute
    pub ppco2_avg: u16,
    /// 0.01 °C
    pub cabin_temp: i16,
    /// 0.01 %
    pub humidity: u16,
    /// 0.1 hPa
    pub pressure: u16,
    /// 0.01 µS
    pub gsr: u16,
    /// % of the minute not at rest
    pub activity: u8,
    pub tremor: u8,
    pub battery_mv: u16,
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase", rename_all_fields = "camelCase")]
pub enum HistoryFrame {
    /// Oldest and newest record on the watch; sent on request and again when a transfer is done.
    Range { oldest: u32, newest: u32 },
    Records { records: Vec<HistoryRecord> },
}

fn history_record(buf: &[u8]) -> Option<HistoryRecord> {
    if buf.len() < HISTORY_RECORD_LEN || buf[0] != HISTORY_RECORD_VERSION {
        return None;
    }
    let mut r = Reader::at(buf, 1);
    Some(HistoryRecord {
        seq: r.u32(),
        unix_time: r.u32(),
        flags: r.u8(),
        status: r.u8(),
        alerts: r.u16(),
        hr_avg: r.u8(),
        hr_min: r.u8(),
        hr_max: r.u8(),
        spo2_avg: r.u8(),
        spo2_min: r.u8(),
        skin_temp: r.i16(),
        co2: (0..12).map(|_| r.u16()).collect(),
        ppco2_avg: r.u16(),
        cabin_temp: r.i16(),
        humidity: r.u16(),
        pressure: r.u16(),
        gsr: r.u16(),
        activity: r.u8(),
        tremor: r.u8(),
        battery_mv: r.u16(),
    })
}

/// `[0][u32 oldest][u32 newest]` is the range; `[n][record × n]` are n records.
pub fn parse_history(buf: &[u8]) -> Result<HistoryFrame, ParseError> {
    let count = *buf.first().ok_or(ParseError::TooShort { kind: 0, len: 0 })? as usize;
    if count == 0 {
        if buf.len() < 9 {
            return Err(ParseError::TooShort { kind: 0, len: buf.len() });
        }
        let mut r = Reader::at(buf, 1);
        return Ok(HistoryFrame::Range { oldest: r.u32(), newest: r.u32() });
    }
    if buf.len() < 1 + count * HISTORY_RECORD_LEN {
        return Err(ParseError::TooShort { kind: count as u8, len: buf.len() });
    }
    let records = (0..count)
        .filter_map(|i| history_record(&buf[1 + i * HISTORY_RECORD_LEN..1 + (i + 1) * HISTORY_RECORD_LEN]))
        .collect();
    Ok(HistoryFrame::Records { records })
}

/// `control` commands from the dashboard to the wrist.
pub mod control {
    pub fn buzzer_test() -> Vec<u8> {
        vec![0x01]
    }
    pub fn raw_streams(on: bool) -> Vec<u8> {
        vec![0x02, on as u8]
    }
    pub fn clear_alert(code: u8) -> Vec<u8> {
        vec![0x03, code]
    }
    pub fn alert(code: u8, severity: u8, message_id: u8) -> Vec<u8> {
        vec![0x04, code, severity, message_id]
    }
    /// Must be the first command after connecting; the code is shown on the watch's screen.
    pub fn unlock(code: u32) -> Vec<u8> {
        let mut v = vec![0x13];
        v.extend_from_slice(&code.to_le_bytes());
        v
    }
    pub fn set_time(unix: u32) -> Vec<u8> {
        let mut v = vec![0x11];
        v.extend_from_slice(&unix.to_le_bytes());
        v
    }
    pub fn demo_mode(on: bool) -> Vec<u8> {
        vec![0x12, on as u8]
    }
    /// 0 asks for the range only; otherwise all records from `from` on.
    pub fn history(from: u32) -> Vec<u8> {
        let mut v = vec![0x10];
        v.extend_from_slice(&from.to_le_bytes());
        v
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn header(kind: u8, seq: u16, t_ms: u32) -> Vec<u8> {
        let mut v = vec![kind, VERSION];
        v.extend_from_slice(&seq.to_le_bytes());
        v.extend_from_slice(&t_ms.to_le_bytes());
        v
    }

    #[test]
    fn vitals_scale_and_invalid_values() {
        let mut b = header(0x05, 7, 1000);
        b.extend_from_slice(&[72, 0, 97, 24]);
        b.extend_from_slice(&3652i16.to_le_bytes());
        b.extend_from_slice(&[0, 0xFF, 12, 0b0101]);
        b.extend_from_slice(&0u16.to_le_bytes());
        assert_eq!(b.len(), 20);
        match parse(&b).unwrap() {
            Packet::Vitals { header, hr_ppg, hr_ecg, spo2, perfusion, skin_temp, tremor_hz, skin_contact, leads_off, motion_artifact, .. } => {
                assert_eq!(header, Header { seq: 7, t_ms: 1000 });
                assert_eq!(hr_ppg, Some(72));
                assert_eq!(hr_ecg, None);
                assert_eq!(spo2, Some(97));
                assert_eq!(perfusion, Some(2.4));
                assert_eq!(skin_temp, Some(36.52));
                assert_eq!(tremor_hz, None);
                assert!(skin_contact && leads_off && !motion_artifact);
            }
            p => panic!("wrong packet {p:?}"),
        }
    }

    #[test]
    fn air_without_fresh_reading_is_all_none() {
        let mut b = header(0x07, 1, 5000);
        b.extend_from_slice(&[0xFF; 11]);
        b.extend_from_slice(&0u16.to_le_bytes());
        match parse(&b).unwrap() {
            Packet::Air { co2_ppm, ppco2_hour, nasa_status, .. } => {
                assert_eq!((co2_ppm, ppco2_hour, nasa_status), (None, None, None));
            }
            p => panic!("wrong packet {p:?}"),
        }
    }

    #[test]
    fn air_ppco2() {
        let mut b = header(0x07, 1, 5000);
        b.extend_from_slice(&3557u16.to_le_bytes());
        b.extend_from_slice(&2240i16.to_le_bytes());
        b.extend_from_slice(&4600u16.to_le_bytes());
        b.extend_from_slice(&270u16.to_le_bytes());
        b.extend_from_slice(&241u16.to_le_bytes());
        b.push(0);
        b.extend_from_slice(&0u16.to_le_bytes());
        assert_eq!(b.len(), 21);
        match parse(&b).unwrap() {
            Packet::Air { co2_ppm, ppco2, ppco2_hour, temp_c, .. } => {
                assert_eq!(co2_ppm, Some(3557));
                assert_eq!(ppco2, Some(2.7));
                assert_eq!(ppco2_hour, Some(2.41));
                assert_eq!(temp_c, Some(22.4));
            }
            p => panic!("wrong packet {p:?}"),
        }
    }

    #[test]
    fn rr_has_variable_length() {
        let mut b = header(0x06, 3, 2000);
        b.push(2);
        b.extend_from_slice(&812u16.to_le_bytes());
        b.extend_from_slice(&845u16.to_le_bytes());
        assert_eq!(parse(&b).unwrap(), Packet::Rr { header: Header { seq: 3, t_ms: 2000 }, intervals_ms: vec![812, 845] });
        assert!(matches!(parse(&b[..10]), Err(ParseError::TooShort { .. })));
    }

    #[test]
    fn event_and_sim() {
        let mut e = header(0x20, 9, 42);
        e.extend_from_slice(&[10, 1, 1]);
        e.extend_from_slice(&(-31i16).to_le_bytes());
        e.push(0);
        assert_eq!(
            parse(&e).unwrap(),
            Packet::Event { header: Header { seq: 9, t_ms: 42 }, code: 10, active: true, severity: 1, value: -31, source: 0 }
        );
        let mut s = header(0x0A, 1, 0);
        s.extend_from_slice(&[1, 0b0010_0000, 1]);
        assert_eq!(parse(&s).unwrap(), Packet::Sim { header: Header { seq: 1, t_ms: 0 }, demo: true, simulated: 0x20, battery_simulated: true });
    }

    #[test]
    fn rejects_bad_input() {
        assert_eq!(parse(&[]), Err(ParseError::TooShort { kind: 0, len: 0 }));
        assert_eq!(parse(&[0x55, 1, 0, 0, 0, 0, 0, 0]), Err(ParseError::UnknownType(0x55)));
        let mut b = header(0x09, 0, 0);
        b[1] = 2;
        b.extend_from_slice(&[0; 8]);
        assert_eq!(parse(&b), Err(ParseError::Version(2)));
    }

    #[test]
    fn packet_serialises_with_kind_tag() {
        let p = Packet::Sim { header: Header { seq: 1, t_ms: 5 }, demo: true, simulated: 0, battery_simulated: false };
        let json = serde_json::to_value(&p).unwrap();
        assert_eq!(json["kind"], "sim");
        assert_eq!(json["batterySimulated"], false);
        assert_eq!(json["header"]["tMs"], 5);
    }

    #[test]
    fn control_set_time_is_little_endian() {
        assert_eq!(control::set_time(0x01020304), vec![0x11, 4, 3, 2, 1]);
    }

    #[test]
    fn unlock_matches_the_documented_example() {
        assert_eq!(control::unlock(873320), vec![0x13, 0x68, 0x53, 0x0D, 0x00]);
    }

    fn history_bytes(seq: u32) -> Vec<u8> {
        let mut v = vec![2];
        v.extend_from_slice(&seq.to_le_bytes());
        v.extend_from_slice(&1_763_200_000u32.to_le_bytes());
        v.extend_from_slice(&[0b1000_0001, 0]);
        v.extend_from_slice(&(1u16 << 10).to_le_bytes());
        v.extend_from_slice(&[72, 64, 88, 97, 95]);
        v.extend_from_slice(&3380i16.to_le_bytes());
        for i in 0..12u16 {
            v.extend_from_slice(&(3400 + i).to_le_bytes());
        }
        v.extend_from_slice(&261u16.to_le_bytes());
        v.extend_from_slice(&2240i16.to_le_bytes());
        v.extend_from_slice(&4600u16.to_le_bytes());
        v.extend_from_slice(&10132u16.to_le_bytes());
        v.extend_from_slice(&250u16.to_le_bytes());
        v.extend_from_slice(&[12, 3]);
        v.extend_from_slice(&3950u16.to_le_bytes());
        assert_eq!(v.len(), HISTORY_RECORD_LEN);
        v
    }

    #[test]
    fn history_range_and_records() {
        let mut range = vec![0];
        range.extend_from_slice(&5u32.to_le_bytes());
        range.extend_from_slice(&900u32.to_le_bytes());
        assert_eq!(parse_history(&range), Ok(HistoryFrame::Range { oldest: 5, newest: 900 }));

        let mut frame = vec![2];
        frame.extend(history_bytes(41));
        frame.extend(history_bytes(42));
        let HistoryFrame::Records { records } = parse_history(&frame).unwrap() else { panic!("expected records") };
        assert_eq!(records.len(), 2);
        assert_eq!(records[1].seq, 42);
        assert_eq!(records[0].hr_avg, 72);
        assert_eq!(records[0].co2[11], 3411);
        assert_eq!(records[0].ppco2_avg, 261);
        assert_eq!(records[0].battery_mv, 3950);
        assert_eq!(records[0].alerts, 1 << 10);

        assert!(parse_history(&frame[..60]).is_err());
        assert_eq!(control::history(0x0102_0304), vec![0x10, 4, 3, 2, 1]);
    }
}
