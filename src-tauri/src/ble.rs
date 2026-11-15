use crate::protocol;
use btleplug::api::{Central, Characteristic, Manager as _, Peripheral as _, ScanFilter, ValueNotification, WriteType};
use btleplug::platform::{Manager, Peripheral};
use futures::{Stream, StreamExt};
use serde::Serialize;
use std::future::Future;
use std::pin::Pin;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering::SeqCst};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter, Manager as _};
use tokio::sync::Mutex;
use uuid::{uuid, Uuid};

pub const DEVICE_NAME: &str = "AstroNav-Wrist";
const SERVICE: Uuid = uuid!("2075864c-7ef8-4db3-9901-ff4606218bb1");
const CHAR_DATA: Uuid = uuid!("8b4d589b-2465-4b5e-9a2c-219eb307cabe");
const CHAR_EVENTS: Uuid = uuid!("631cd0ae-17e9-48b0-beec-431b6a4ca732");
const CHAR_CONTROL: Uuid = uuid!("4419bc3d-3bfd-40d1-8da1-6bcae37219b5");

const SCAN_TIMEOUT: Duration = Duration::from_secs(12);
/// The watch streams many packets a second; this long without one means something is wrong.
const SILENCE: Duration = Duration::from_secs(4);
/// After this many silent periods in a row the link counts as lost, even if Windows still says connected.
const SILENT_PERIODS_LOST: u32 = 3;
const RETRY_MAX_WAIT: Duration = Duration::from_secs(5);

/// Returned when the user pressed Disconnect while a connection was being set up.
pub const CANCELLED: &str = "Connection cancelled.";
const LOST: &str = "The connection to the watch was lost.";

type Notifications = Pin<Box<dyn Stream<Item = ValueNotification> + Send>>;

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "state", rename_all = "camelCase")]
pub enum LinkStatus {
    Disconnected { reason: Option<String> },
    Scanning,
    Connecting { name: String },
    Connected { name: String },
    Reconnecting { name: String, attempt: u32, reason: String },
}

struct Link {
    peripheral: Peripheral,
    control: Characteristic,
}

#[derive(Default)]
pub struct Ble {
    link: Mutex<Option<Link>>,
    /// Serialises connection attempts, so `link` is only locked briefly and commands are never stuck behind a scan.
    connecting: Mutex<()>,
    /// The user wants a connection. Cleared by Disconnect, which also stops scanning and retrying.
    wanted: AtomicBool,
    /// Bumped for every new link and on Disconnect. A watcher from an older session stays quiet when its stream ends.
    session: AtomicU64,
}

#[derive(Clone, Copy, PartialEq)]
enum Mode {
    /// The user pressed Connect: report every step and every failure.
    User,
    /// Automatic retry after a lost link: the UI already shows "Reconnecting", so stay quiet.
    Retry,
}

fn emit_status(app: &AppHandle, status: LinkStatus) {
    let _ = app.emit("ble-status", status);
}

async fn find_wrist(app: &AppHandle, mode: Mode, wanted: &AtomicBool) -> Result<Peripheral, String> {
    let manager = Manager::new().await.map_err(|e| format!("Bluetooth is not available: {e}"))?;
    let central = manager
        .adapters()
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .next()
        .ok_or("No Bluetooth adapter found. Is Bluetooth switched on?")?;

    if mode == Mode::User {
        emit_status(app, LinkStatus::Scanning);
    }
    central
        .start_scan(ScanFilter { services: vec![SERVICE] })
        .await
        .map_err(|e| e.to_string())?;

    let deadline = tokio::time::Instant::now() + SCAN_TIMEOUT;
    let found = 'scan: loop {
        if !wanted.load(SeqCst) {
            let _ = central.stop_scan().await;
            return Err(CANCELLED.into());
        }
        for p in central.peripherals().await.map_err(|e| e.to_string())? {
            if let Ok(Some(props)) = p.properties().await {
                // the name is in the scan response, the service UUID in the advertisement
                if props.local_name.as_deref() == Some(DEVICE_NAME) || props.services.contains(&SERVICE) {
                    break 'scan Some(p);
                }
            }
        }
        if tokio::time::Instant::now() > deadline {
            break None;
        }
        tokio::time::sleep(Duration::from_millis(400)).await;
    };
    let _ = central.stop_scan().await;
    found.ok_or_else(|| format!("No {DEVICE_NAME} found. Is the watch on and not connected to another laptop?"))
}

impl Ble {
    pub async fn connect(&self, app: AppHandle) -> Result<String, String> {
        self.wanted.store(true, SeqCst);
        self.establish(&app, Mode::User).await
    }

    async fn is_connected(&self) -> bool {
        // clone out so the lock is not held during the Bluetooth call
        let peripheral = self.link.lock().await.as_ref().map(|l| l.peripheral.clone());
        match peripheral {
            Some(p) => p.is_connected().await.unwrap_or(false),
            None => false,
        }
    }

    async fn establish(&self, app: &AppHandle, mode: Mode) -> Result<String, String> {
        let _attempt = self.connecting.lock().await;
        if self.is_connected().await {
            return Ok(DEVICE_NAME.into());
        }
        let fail = |e: String| {
            // a cancel is the user's own doing, and a retry failure is shown as "Reconnecting"
            if mode == Mode::User && e != CANCELLED {
                emit_status(app, LinkStatus::Disconnected { reason: Some(e.clone()) });
            }
            Err(e)
        };

        let peripheral = match find_wrist(app, mode, &self.wanted).await {
            Ok(p) => p,
            Err(e) => return fail(e),
        };
        if mode == Mode::User {
            emit_status(app, LinkStatus::Connecting { name: DEVICE_NAME.into() });
        }

        let result = async {
            peripheral.connect().await.map_err(|e| format!("Could not connect: {e}"))?;
            peripheral.discover_services().await.map_err(|e| e.to_string())?;
            let chars = peripheral.characteristics();
            let find = |id: Uuid| chars.iter().find(|c| c.uuid == id).cloned();
            let data = find(CHAR_DATA).ok_or("The watch has no data characteristic")?;
            let events = find(CHAR_EVENTS).ok_or("The watch has no events characteristic")?;
            let control = find(CHAR_CONTROL).ok_or("The watch has no control characteristic")?;
            // all characteristics need an encrypted, paired link; Windows asks for the code from the OLED
            peripheral
                .subscribe(&data)
                .await
                .map_err(|e| format!("Subscribing failed. Pair the watch in Windows Bluetooth settings first, with the code on its screen. ({e})"))?;
            peripheral.subscribe(&events).await.map_err(|e| e.to_string())?;
            let notifications = peripheral.notifications().await.map_err(|e| e.to_string())?;
            if !self.wanted.load(SeqCst) {
                return Err(CANCELLED.to_string());
            }
            Ok::<_, String>((control, notifications))
        }
        .await;

        let (control, notifications) = match result {
            Ok(r) => r,
            Err(e) => {
                let _ = peripheral.disconnect().await;
                return fail(e);
            }
        };

        // the watch keeps its history with real timestamps once it knows the time
        let unix = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs() as u32).unwrap_or(0);
        let _ = peripheral.write(&control, &protocol::control::set_time(unix), WriteType::WithResponse).await;

        let id = self.session.fetch_add(1, SeqCst) + 1;
        *self.link.lock().await = Some(Link { peripheral: peripheral.clone(), control });
        spawn_watch(app.clone(), peripheral, notifications, id);
        emit_status(app, LinkStatus::Connected { name: DEVICE_NAME.into() });
        Ok(DEVICE_NAME.into())
    }

    pub async fn disconnect(&self, app: AppHandle) -> Result<(), String> {
        // first, so the watcher of the current link and any retry loop know this was on purpose
        self.wanted.store(false, SeqCst);
        self.session.fetch_add(1, SeqCst);
        let link = self.link.lock().await.take();
        emit_status(&app, LinkStatus::Disconnected { reason: None });
        if let Some(l) = link {
            l.peripheral.disconnect().await.map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub async fn send(&self, bytes: Vec<u8>) -> Result<(), String> {
        let (peripheral, control) = {
            let link = self.link.lock().await;
            let l = link.as_ref().ok_or("The watch is not connected")?;
            (l.peripheral.clone(), l.control.clone())
        };
        peripheral
            .write(&control, &bytes, WriteType::WithResponse)
            .await
            .map_err(|e| format!("The watch did not take the command: {e}"))
    }
}

/// Forwards packets to the UI until the link drops, then reconnects unless the user disconnected.
/// A plain fn (not async) so the future types of `establish` and the watcher do not refer to each other.
fn spawn_watch(app: AppHandle, peripheral: Peripheral, mut notifications: Notifications, id: u64) {
    tauri::async_runtime::spawn(async move {
        let mut silent = 0;
        loop {
            match tokio::time::timeout(SILENCE, notifications.next()).await {
                Ok(Some(n)) => {
                    silent = 0;
                    match protocol::parse(&n.value) {
                        Ok(packet) => {
                            let _ = app.emit("telemetry", &packet);
                        }
                        Err(e) => eprintln!("skipped packet: {e}"),
                    }
                }
                Ok(None) => break,
                // Windows does not always end the stream when the watch walks away, so check by hand
                Err(_) => {
                    silent += 1;
                    if silent >= SILENT_PERIODS_LOST || !peripheral.is_connected().await.unwrap_or(false) {
                        break;
                    }
                }
            }
        }

        let ble = app.state::<Ble>();
        if ble.session.load(SeqCst) != id || !ble.wanted.load(SeqCst) {
            return; // the user disconnected, or a newer link took over
        }
        {
            let mut link = ble.link.lock().await;
            if ble.session.load(SeqCst) == id {
                *link = None;
            }
        }
        let _ = peripheral.disconnect().await;
        reconnect(&app, &ble, id).await;
    });
}

async fn reconnect(app: &AppHandle, ble: &Ble, lost: u64) {
    let mut attempt: u32 = 0;
    loop {
        if !ble.wanted.load(SeqCst) || ble.session.load(SeqCst) != lost {
            return;
        }
        attempt += 1;
        emit_status(app, LinkStatus::Reconnecting { name: DEVICE_NAME.into(), attempt, reason: LOST.into() });
        // boxed to break the type cycle establish -> spawn_watch -> reconnect -> establish
        let next: Pin<Box<dyn Future<Output = Result<String, String>> + Send + '_>> = Box::pin(ble.establish(app, Mode::Retry));
        match next.await {
            Ok(_) => return,
            Err(e) => eprintln!("reconnect attempt {attempt} failed: {e}"),
        }
        tokio::time::sleep(RETRY_MAX_WAIT.min(Duration::from_secs(attempt as u64))).await;
    }
}
