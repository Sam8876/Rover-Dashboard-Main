import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { GpsData, RadarData, ImuData, EnvData, PowerData, YoloObject } from '../types/rover.types';

// ── Animated mock data (shown when disconnected) ───────────────
function useMockData() {
    const [gpsData, setGpsData] = useState<GpsData>({
        lat: 18.5840, lon: 73.7365, speed: 0, heading: 0, satellites: 6,
    });
    const [radarData, setRadarData] = useState<RadarData>({
        front: 99, back: 99, left: 99, right: 99,
    });
    const [imuData, setImuData] = useState<ImuData>({
        roll: 0, pitch: 0, yaw: 0,
    });
    const [envData, setEnvData] = useState<EnvData>({
        temperature: 28, humidity: 55, lux: 420,
    });
    const [powerData, setPowerData] = useState<PowerData>({
        solarV: 13.2, solarI: 850, solarW: 11.2,
        loadV: 12.1, loadI: 1200, loadW: 14.5,
    });

    const t = useRef(0);

    useEffect(() => {
        const id = setInterval(() => {
            t.current += 0.05;
            const s = Math.sin(t.current);
            const c = Math.cos(t.current * 0.7);

            setGpsData(prev => ({
                lat: prev.lat + (Math.random() - 0.5) * 0.00001,
                lon: prev.lon + (Math.random() - 0.5) * 0.00001,
                speed: Math.max(0, 8 + s * 5),
                heading: (prev.heading + 1.2) % 360,
                satellites: 6 + Math.round(Math.abs(s)),
            }));

            setRadarData({
                front: Math.max(10, 80 + s * 60),
                back: Math.max(10, 60 + c * 40),
                left: Math.max(10, 100 + s * 50),
                right: Math.max(10, 70 + c * 55),
            });

            setImuData({
                roll: s * 12,
                pitch: c * 8,
                yaw: (t.current * 20) % 360,
            });

            setEnvData({
                temperature: 28 + s * 4,
                humidity: 55 + c * 10,
                lux: 420 + Math.abs(s) * 200,
            });

            setPowerData({
                solarV: 13.2 + s * 0.4,
                solarI: 850 + c * 150,
                solarW: (13.2 + s * 0.4) * ((850 + c * 150) / 1000),
                loadV: 12.1 + c * 0.3,
                loadI: 1200 + s * 200,
                loadW: (12.1 + c * 0.3) * ((1200 + s * 200) / 1000),
            });
        }, 500);

        return () => clearInterval(id);
    }, []);

    return {
        gpsData,
        radarData,
        imuData,
        envData,
        powerData,
        yoloObjects: [] as YoloObject[],
    };
}

// ── Live data from WebSocket ───────────────────────────────────
function useLiveData(socket: Socket | null) {
    const [gpsData, setGpsData] = useState<GpsData | null>(null);
    const [radarData, setRadarData] = useState<RadarData | null>(null);
    const [imuData, setImuData] = useState<ImuData | null>(null);
    const [envData, setEnvData] = useState<EnvData | null>(null);
    const [powerData, setPowerData] = useState<PowerData | null>(null);
    const [yoloObjects, setYoloObjects] = useState<YoloObject[]>([]);

    useEffect(() => {
        if (!socket) return;

        socket.on('gps-data', (d: GpsData) => setGpsData(d));
        socket.on('radar-data', (d: RadarData) => setRadarData(d));
        socket.on('imu-data', (d: ImuData) => setImuData(d));
        socket.on('env-data', (d: EnvData) => setEnvData(d));
        socket.on('power-data', (d: PowerData) => setPowerData(d));
        socket.on('yolo-detections', (d: YoloObject[]) => setYoloObjects(d));

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

// ── Public hook — live when connected, mock when offline ───────
export function useRoverData(socket: Socket | null, connected: boolean) {
    const mock = useMockData();
    const live = useLiveData(socket);

    if (connected) {
        return {
            gpsData: live.gpsData ?? mock.gpsData,
            radarData: live.radarData ?? mock.radarData,
            imuData: live.imuData ?? mock.imuData,
            envData: live.envData ?? mock.envData,
            powerData: live.powerData ?? mock.powerData,
            yoloObjects: live.yoloObjects,
        };
    }

    return mock;
}
