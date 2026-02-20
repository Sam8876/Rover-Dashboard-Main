import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { GpsData, RadarData, ImuData, EnvData, PowerData, YoloObject } from '../types/rover.types';

export function useRoverData(socket: Socket | null) {
    const [gpsData, setGpsData] = useState<GpsData | null>(null);
    const [radarData, setRadarData] = useState<RadarData | null>(null);
    const [imuData, setImuData] = useState<ImuData | null>(null);
    const [envData, setEnvData] = useState<EnvData | null>(null);
    const [powerData, setPowerData] = useState<PowerData | null>(null);
    const [yoloObjects, setYoloObjects] = useState<YoloObject[]>([]);

    useEffect(() => {
        if (!socket) return;

        // GPS-GSM ESP32
        socket.on('gps-data', (data: GpsData) => setGpsData(data));

        // Sensor ESP32 — ultrasonic
        socket.on('radar-data', (data: RadarData) => setRadarData(data));

        // Sensor ESP32 — IMU (MPU6050)
        socket.on('imu-data', (data: ImuData) => setImuData(data));

        // Sensor ESP32 — Environment (DHT22 / BME280 / BH1750)
        socket.on('env-data', (data: EnvData) => setEnvData(data));

        // Sensor ESP32 — Power (INA219)
        socket.on('power-data', (data: PowerData) => setPowerData(data));

        // Camera ESP32 / Pi — YOLO detections
        socket.on('yolo-detections', (objects: YoloObject[]) => setYoloObjects(objects));

        return () => {
            socket.off('gps-data');
            socket.off('radar-data');
            socket.off('imu-data');
            socket.off('env-data');
            socket.off('power-data');
            socket.off('yolo-detections');
        };
    }, [socket]);

    return { gpsData, radarData, imuData, envData, powerData, yoloObjects };
}
