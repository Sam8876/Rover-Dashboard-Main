// ─── GPS-GSM ESP32 ───────────────────────────────
export interface GpsData {
    lat: number;
    lon: number;
    speed: number;     // km/h
    heading: number;   // degrees 0-360
    satellites?: number;
    signal?: number;   // GSM signal strength
    active?: boolean;
    sos?: boolean;
}

// ─── Sensor ESP32 ────────────────────────────────
export interface RadarData {
    front: number;   // cm
    right: number;
    back: number;
    left: number;
}

export interface ImuData {
    roll: number;    // degrees
    pitch: number;
    yaw: number;
}

export interface EnvData {
    temperature: number;   // °C
    humidity: number;      // %
    lux: number;           // lux
}

export interface PowerData {
    solarV: number;   // Solar panel voltage (V)
    loadV: number;   // Load/battery voltage (V)
    solarI: number;   // Solar current (mA)
    loadI: number;   // Load current (mA)
    solarW?: number;   // Solar power (W) — calculated
    loadW?: number;   // Load power (W) — calculated
}

// ─── Camera / YOLO ───────────────────────────────
export interface YoloObject {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    conf: string;
}

// ─── Waypoints ───────────────────────────────────
export interface Waypoint {
    lat: number;
    lon: number;
    id: string;
}
