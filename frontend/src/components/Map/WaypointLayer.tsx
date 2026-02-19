import { Marker, Popup, Polyline } from 'react-leaflet';
import { Icon, type LatLngExpression } from 'leaflet';
import type { Waypoint } from '../../types/rover.types';

interface WaypointLayerProps {
    waypoints: Waypoint[];
    onRemoveWaypoint: (id: string) => void;
}

export default function WaypointLayer({
    waypoints,
    onRemoveWaypoint,
}: WaypointLayerProps) {
    // Create numbered markers for waypoints
    const createNumberedIcon = (index: number) => {
        return new Icon({
            iconUrl: `data:image/svg+xml,${encodeURIComponent(`
        <svg width="30" height="40" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 0 C7 0 0 7 0 15 C0 25 15 40 15 40 C15 40 30 25 30 15 C30 7 23 0 15 0 Z" fill="%2300ffe1" stroke="%23ffffff" stroke-width="2"/>
          <circle cx="15" cy="15" r="10" fill="%23ffffff"/>
          <text x="15" y="20" font-size="12" font-weight="bold" text-anchor="middle" fill="%23000000">${index + 1}</text>
        </svg>
      `)}`,
            iconSize: [30, 40],
            iconAnchor: [15, 40],
            popupAnchor: [0, -40],
        });
    };

    // Create polyline points
    const polylinePoints: LatLngExpression[] = waypoints.map((wp) => [
        wp.lat,
        wp.lon,
    ]);

    return (
        <>
            {/* Draw route line */}
            {waypoints.length > 1 && (
                <Polyline
                    positions={polylinePoints}
                    color="#00ffe1"
                    weight={3}
                    opacity={0.7}
                    dashArray="10, 10"
                />
            )}

            {/* Draw waypoint markers */}
            {waypoints.map((waypoint, index) => (
                <Marker
                    key={waypoint.id}
                    position={[waypoint.lat, waypoint.lon]}
                    icon={createNumberedIcon(index)}
                >
                    <Popup>
                        <div className="text-sm font-mono">
                            <div className="font-bold">Waypoint {index + 1}</div>
                            <div>Lat: {waypoint.lat.toFixed(6)}</div>
                            <div>Lon: {waypoint.lon.toFixed(6)}</div>
                            <button
                                onClick={() => onRemoveWaypoint(waypoint.id)}
                                className="mt-2 px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                            >
                                Remove
                            </button>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </>
    );
}
