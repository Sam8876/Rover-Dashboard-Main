import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { GpsData, RadarData, YoloObject } from '../types/rover.types';

export function useRoverData(socket: Socket | null) {
    const [gpsData, setGpsData] = useState<GpsData | null>(null);
    const [radarData, setRadarData] = useState<RadarData | null>(null);
    const [cameraFrame, setCameraFrame] = useState<string | null>(null);
    const [yoloObjects, setYoloObjects] = useState<YoloObject[]>([]);

    useEffect(() => {
        if (!socket) return;

        // GPS data listener
        socket.on('gps-data', (data: GpsData) => {
            setGpsData(data);
        });

        // Radar data listener
        socket.on('radar-data', (data: RadarData) => {
            setRadarData(data);
        });

        // Camera frame listener
        socket.on('camera-frame', (frame: ArrayBuffer | string) => {
            if (frame instanceof ArrayBuffer) {
                const blob = new Blob([frame], { type: 'image/jpeg' });
                const url = URL.createObjectURL(blob);
                setCameraFrame(url);
            } else {
                setCameraFrame(frame);
            }
        });

        // YOLO detections listener
        socket.on('yolo-detections', (objects: YoloObject[]) => {
            setYoloObjects(objects);
        });

        return () => {
            socket.off('gps-data');
            socket.off('radar-data');
            socket.off('camera-frame');
            socket.off('yolo-detections');
        };
    }, [socket]);

    return { gpsData, radarData, cameraFrame, yoloObjects };
}
