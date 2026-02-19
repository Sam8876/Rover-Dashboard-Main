export interface GpsData {
    lat: number;
    lon: number;
    speed: number; // km/h
    heading: number; // degrees 0-360
}

export interface RadarData {
    front: number;
    right: number;
    back: number;
    left: number;
}

export interface YoloObject {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    conf: string;
}

export interface Waypoint {
    lat: number;
    lon: number;
    id: string;
}
