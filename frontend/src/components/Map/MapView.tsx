import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { GpsData, Waypoint } from '../../types/rover.types';
import RoverMarker from './RoverMarker';
import WaypointLayer from './WaypointLayer';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
    gpsData: GpsData | null;
    socket: Socket | null;
}

function MapClickHandler({
    onMapClick,
}: {
    onMapClick: (lat: number, lon: number) => void;
}) {
    useMapEvents({
        click: (e) => {
            onMapClick(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

export default function MapView({ gpsData, socket }: MapViewProps) {
    const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

    // Default center (will be replaced by actual rover position)
    const center: [number, number] = gpsData
        ? [gpsData.lat, gpsData.lon]
        : [18.584056, 73.736556]; // Default: 18°35'02.6"N 73°44'11.6"E

    const handleMapClick = (lat: number, lon: number) => {
        const newWaypoint: Waypoint = {
            lat,
            lon,
            id: Date.now().toString(),
        };

        setWaypoints([...waypoints, newWaypoint]);

        // Send to backend
        if (socket) {
            socket.emit('add-waypoint', { lat, lon });
        }

        console.log('Waypoint added:', newWaypoint);
    };

    const handleRemoveWaypoint = (id: string) => {
        const index = waypoints.findIndex((wp) => wp.id === id);
        setWaypoints(waypoints.filter((wp) => wp.id !== id));

        // Send to backend
        if (socket) {
            socket.emit('remove-waypoint', { index });
        }

        console.log('Waypoint removed:', id);
    };

    const handleClearWaypoints = () => {
        setWaypoints([]);
        if (socket) {
            socket.emit('clear-waypoints');
        }
    };

    return (
        <div className="map-wrapper">
            <MapContainer
                center={center}
                zoom={15}
                className="w-full h-full"
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapClickHandler onMapClick={handleMapClick} />

                <RoverMarker gpsData={gpsData} />

                <WaypointLayer
                    waypoints={waypoints}
                    onRemoveWaypoint={handleRemoveWaypoint}
                />
            </MapContainer>

            {/* Waypoint control panel - fixed so it's above the isolated map */}
            {waypoints.length > 0 && (
                <div style={{ position: 'fixed', top: '5rem', left: '1rem', zIndex: 9999 }}
                    className="bg-black/50 backdrop-blur-md border-2 border-rover-cyan rounded-lg p-4 shadow-lg shadow-rover-cyan/25 min-w-[200px]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-rover-cyan font-bold text-sm tracking-wider">
                            WAYPOINTS ({waypoints.length})
                        </h3>
                        <button
                            onClick={handleClearWaypoints}
                            className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                    <div className="text-xs text-white/70 font-mono mb-3">
                        Click map to add waypoints
                    </div>
                    <button
                        onClick={() => {
                            if (socket) {
                                socket.emit('start-navigation', { waypoints });
                                console.log('Navigation started with waypoints:', waypoints);
                            }
                        }}
                        className="w-full bg-rover-cyan hover:bg-rover-cyan/80 text-black font-bold py-2 px-4 rounded transition-colors"
                    >
                        ▶ START NAVIGATION
                    </button>
                </div>
            )}
        </div>
    );
}
