import { useState } from 'react';
import { Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import { DivIcon, type LatLngExpression } from 'leaflet';
import type { GpsData } from '../../types/rover.types';

interface RoverMarkerProps {
    gpsData: GpsData | null;
}

// ── Tracks map zoom level and re-renders when it changes ───────
function useZoom() {
    const map = useMap();
    const [zoom, setZoom] = useState(map.getZoom());
    useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
    return zoom;
}

// ── Inner component (needs to be inside MapContainer) ──────────
function RoverMarkerInner({ gpsData }: RoverMarkerProps) {
    const zoom = useZoom();

    // Scale marker size with zoom
    const baseSize = Math.max(16, Math.min(56, (zoom - 8) * 6));

    // No GPS fix yet — show a pulsing "waiting" dot at (0, 0)
    if (!gpsData) {
        const waitHtml = `
            <div style="
                width: ${baseSize}px;
                height: ${baseSize}px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    width: ${Math.max(10, baseSize * 0.5)}px;
                    height: ${Math.max(10, baseSize * 0.5)}px;
                    border-radius: 50%;
                    background: rgba(255,180,0,0.3);
                    border: 2px solid #f59e0b;
                    box-shadow: 0 0 10px #f59e0baa;
                    animation: pulse 1.5s infinite;
                "/>
            </div>
        `;
        const waitIcon = new DivIcon({
            className: '',
            html: waitHtml,
            iconSize: [baseSize, baseSize],
            iconAnchor: [baseSize / 2, baseSize / 2],
        });
        return (
            <Marker position={[0, 0]} icon={waitIcon}>
                <Popup>
                    <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                        <div style={{ color: '#f59e0b', fontWeight: 700 }}>⏳ Waiting for GPS fix…</div>
                        <div style={{ color: '#666', marginTop: '4px' }}>No signal yet</div>
                    </div>
                </Popup>
            </Marker>
        );
    }

    const heading = gpsData.heading ?? 0;

    const html = `
        <div style="
            width: ${baseSize}px;
            height: ${baseSize}px;
            transform: rotate(${heading}deg);
            transform-origin: center;
            filter: drop-shadow(0 0 ${Math.round(baseSize * 0.2)}px rgba(0,255,225,0.8));
        ">
            <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" width="${baseSize}" height="${baseSize}">
                <!-- Outer glow ring -->
                <circle cx="30" cy="30" r="28" fill="none"
                    stroke="rgba(0,255,225,0.2)" stroke-width="2"/>

                <!-- Main arrow body -->
                <polygon points="30,4 44,50 30,40 16,50"
                    fill="#00ffe1"
                    stroke="rgba(0,0,0,0.6)"
                    stroke-width="2"
                    stroke-linejoin="round"/>

                <!-- Notch at the tail for a proper arrow look -->
                <polygon points="30,40 16,50 30,44 44,50"
                    fill="rgba(0,180,160,0.7)"/>

                <!-- Center dot -->
                <circle cx="30" cy="30" r="${Math.max(2, baseSize * 0.08)}"
                    fill="white" opacity="0.9"/>
            </svg>
        </div>
    `;

    const icon = new DivIcon({
        className: '',   // clear leaflet default styles
        html,
        iconSize: [baseSize, baseSize],
        iconAnchor: [baseSize / 2, baseSize / 2],
    });

    const position: LatLngExpression = [gpsData.lat, gpsData.lon];

    return (
        <Marker position={position} icon={icon}>
            <Popup className="rover-popup">
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#0d0d0d', minWidth: '140px' }}>
                    <div style={{ color: '#00ffe1', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                        ◈ NEXUS PRIME
                    </div>
                    <div>📍 {gpsData.lat.toFixed(6)}, {gpsData.lon.toFixed(6)}</div>
                    <div>⚡ {gpsData.speed.toFixed(1)} km/h</div>
                    <div>🧭 {heading.toFixed(0)}°</div>
                    {gpsData.satellites !== undefined && (
                        <div>🛰 {gpsData.satellites} satellites</div>
                    )}
                </div>
            </Popup>
        </Marker>
    );
}

// ── Public export ──────────────────────────────────────────────
export default function RoverMarker({ gpsData }: RoverMarkerProps) {
    return <RoverMarkerInner gpsData={gpsData} />;
}
