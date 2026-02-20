import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { GpsData, RadarData, ImuData, EnvData, PowerData, YoloObject } from '../types/rover.types';

export function useRoverData(socket: Socket | null, _connected?: boolean) {
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
