mod ble;
mod protocol;

use ble::Ble;
use protocol::control;
use tauri::{AppHandle, State};

#[tauri::command]
fn app_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

/// Connects and unlocks the watch with the 6-digit code from its screen.
#[tauri::command]
async fn ble_connect(app: AppHandle, ble: State<'_, Ble>, code: u32) -> Result<String, String> {
    ble.connect(app, code).await
}

#[tauri::command]
async fn ble_disconnect(app: AppHandle, ble: State<'_, Ble>) -> Result<(), String> {
    ble.disconnect(app).await
}

/// Shows a message on the watch and plays the buzzer pattern for the severity.
#[tauri::command]
async fn ble_send_alert(ble: State<'_, Ble>, code: u8, severity: u8, message_id: u8) -> Result<(), String> {
    ble.send(control::alert(code, severity, message_id)).await
}

/// Tells the watch an alert was handled on the dashboard, so it stops beeping for that code.
#[tauri::command]
async fn ble_clear_alert(ble: State<'_, Ble>, code: u8) -> Result<(), String> {
    ble.send(control::clear_alert(code)).await
}

#[tauri::command]
async fn ble_buzzer_test(ble: State<'_, Ble>) -> Result<(), String> {
    ble.send(control::buzzer_test()).await
}

#[tauri::command]
async fn ble_raw_streams(ble: State<'_, Ble>, on: bool) -> Result<(), String> {
    ble.send(control::raw_streams(on)).await
}

#[tauri::command]
async fn ble_demo_mode(ble: State<'_, Ble>, on: bool) -> Result<(), String> {
    ble.send(control::demo_mode(on)).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Ble::default())
        .invoke_handler(tauri::generate_handler![
            app_version,
            ble_connect,
            ble_disconnect,
            ble_send_alert,
            ble_clear_alert,
            ble_buzzer_test,
            ble_raw_streams,
            ble_demo_mode,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AstroNav Dashboard");
}
