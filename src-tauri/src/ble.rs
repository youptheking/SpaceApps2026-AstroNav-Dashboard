use crate::protocol;
use btleplug::api::{Central, Characteristic, Manager as _, Peripheral as _, ScanFilter, WriteType};
use btleplug::platform::{Manager, Peripheral};
use futures::StreamExt;
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};
use tokio::sync::{oneshot, Mutex};
use uuid::{uuid, Uuid};

pub const DEVICE_NAME: &str = "AstroNav-Wrist";
const SERVICE: Uuid = uuid!("2075864c-7ef8-4db3-9901-ff4606218bb1");
const CHAR_DATA: Uuid = uuid!("8b4d589b-2465-4b5e-9a2c-219eb307cabe");
const CHAR_EVENTS: Uuid = uuid!("631cd0ae-17e9-48b0-beec-431b6a4ca732");
const CHAR_CONTROL: Uuid = uuid!("4419bc3d-3bfd-40d1-8da1-6bcae37219b5");

const SCAN_TIMEOUT: Duration = Duration::from_secs(12);
// the watch answers a good code within a second; a bit of slack for the radio
const UNLOCK_TIMEOUT: Duration = Duration::from_millis(1500);

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "state", rename_all = "camelCase")]
pub enum LinkStatus {
    Disconnected { reason: Option<String> },
    Scanning,
    Connecting { name: String },
    Connected { name: String },
}

struct Link {
    peripheral: Peripheral,
    control: Characteristic,
    closing: Arc<AtomicBool>,
}

#[derive(Default)]
pub struct Ble {
    link: Mutex<Option<Link>>,
}

fn emit_status(app: &AppHandle, status: LinkStatus) {
    let _ = app.emit("ble-status", status);
}

async fn find_wrist(app: &AppHandle) -> Result<Peripheral, String> {
    let manager = Manager::new().await.map_err(|e| format!("Bluetooth is not available: {e}"))?;
    let central = manager
        .adapters()
        .await
        .map_err(|e| e.to_string())?
        .into_iter()
        .next()
        .ok_or("No Bluetooth adapter found. Is Bluetooth switched on?")?;

    emit_status(app, LinkStatus::Scanning);
    central
        .start_scan(ScanFilter { services: vec![SERVICE] })
        .await
        .map_err(|e| e.to_string())?;

    let deadline = tokio::time::Instant::now() + SCAN_TIMEOUT;
    let found = 'scan: loop {
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
    pub async fn connect(&self, app: AppHandle, code: u32) -> Result<String, String> {
        let mut link = self.link.lock().await;
        if let Some(l) = link.as_ref() {
            if l.peripheral.is_connected().await.unwrap_or(false) {
                return Ok(DEVICE_NAME.into());
            }
        }

        let peripheral = match find_wrist(&app).await {
            Ok(p) => p,
            Err(e) => {
                emit_status(&app, LinkStatus::Disconnected { reason: Some(e.clone()) });
                return Err(e);
            }
        };
        emit_status(&app, LinkStatus::Connecting { name: DEVICE_NAME.into() });

        // set before we close the link ourselves, so the stream does not report it as lost
        let closing = Arc::new(AtomicBool::new(false));
        let fail = |e: String| {
            let peripheral = peripheral.clone();
            let app = app.clone();
            let closing = closing.clone();
            async move {
                closing.store(true, Ordering::SeqCst);
                let _ = peripheral.disconnect().await;
                emit_status(&app, LinkStatus::Disconnected { reason: Some(e.clone()) });
                Err::<String, String>(e)
            }
        };

        // no OS pairing: the link is open, and the app unlocks the watch with the code from its screen
        let control = match async {
            peripheral.connect().await.map_err(|e| format!("Could not connect: {e}"))?;
            peripheral.discover_services().await.map_err(|e| e.to_string())?;
            let chars = peripheral.characteristics();
            let find = |id: Uuid| chars.iter().find(|c| c.uuid == id).cloned();
            let data = find(CHAR_DATA).ok_or("The watch has no data characteristic")?;
            let events = find(CHAR_EVENTS).ok_or("The watch has no events characteristic")?;
            let control = find(CHAR_CONTROL).ok_or("The watch has no control characteristic")?;
            peripheral.subscribe(&data).await.map_err(|e| format!("Could not listen to the watch: {e}"))?;
            peripheral.subscribe(&events).await.map_err(|e| format!("Could not listen to the watch: {e}"))?;
            Ok::<_, String>(control)
        }
        .await
        {
            Ok(c) => c,
            Err(e) => return fail(e).await,
        };

        let mut notifications = match peripheral.notifications().await {
            Ok(n) => n,
            Err(e) => return fail(e.to_string()).await,
        };
        let (unlocked_tx, unlocked_rx) = oneshot::channel::<()>();
        let stream_app = app.clone();
        let stream_closing = closing.clone();
        tauri::async_runtime::spawn(async move {
            let mut unlocked_tx = Some(unlocked_tx);
            while let Some(n) = notifications.next().await {
                match protocol::parse(&n.value) {
                    Ok(packet) => {
                        // the watch sends nothing until unlocked, then STATUS and SIM right away
                        if let Some(tx) = unlocked_tx.take() {
                            let _ = tx.send(());
                        }
                        let _ = stream_app.emit("telemetry", &packet);
                    }
                    Err(e) => eprintln!("skipped packet: {e}"),
                }
            }
            if !stream_closing.load(Ordering::SeqCst) {
                emit_status(&stream_app, LinkStatus::Disconnected { reason: Some("The connection to the watch was lost.".into()) });
            }
        });

        if let Err(e) = peripheral.write(&control, &protocol::control::unlock(code), WriteType::WithResponse).await {
            return fail(format!("Could not send the code: {e}")).await;
        }
        if tokio::time::timeout(UNLOCK_TIMEOUT, unlocked_rx).await.is_err() {
            return fail("Wrong code. Type the 6 digits shown on the watch.".into()).await;
        }

        // the watch keeps its history with real timestamps once it knows the time
        let unix = SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_secs() as u32).unwrap_or(0);
        let _ = peripheral.write(&control, &protocol::control::set_time(unix), WriteType::WithResponse).await;

        *link = Some(Link { peripheral, control, closing });
        emit_status(&app, LinkStatus::Connected { name: DEVICE_NAME.into() });
        Ok(DEVICE_NAME.into())
    }

    pub async fn disconnect(&self, app: AppHandle) -> Result<(), String> {
        if let Some(l) = self.link.lock().await.take() {
            l.closing.store(true, Ordering::SeqCst);
            l.peripheral.disconnect().await.map_err(|e| e.to_string())?;
        }
        emit_status(&app, LinkStatus::Disconnected { reason: None });
        Ok(())
    }

    pub async fn send(&self, bytes: Vec<u8>) -> Result<(), String> {
        let link = self.link.lock().await;
        let l = link.as_ref().ok_or("The watch is not connected")?;
        l.peripheral
            .write(&l.control, &bytes, WriteType::WithResponse)
            .await
            .map_err(|e| format!("The watch did not take the command: {e}"))
    }
}
