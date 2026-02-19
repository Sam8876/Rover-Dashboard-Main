import { Marker, Popup } from 'react-leaflet';
import { DivIcon, type LatLngExpression } from 'leaflet';
import type { GpsData } from '../../types/rover.types';

interface RoverMarkerProps {
    gpsData: GpsData | null;
}

export default function RoverMarker({ gpsData }: RoverMarkerProps) {
    if (!gpsData) return null;

    const position: LatLngExpression = [gpsData.lat, gpsData.lon];

    // Create custom arrow icon with rotation
    const arrowIcon = new DivIcon({
        className: 'rover-marker',
        html: `
      <div style="transform: rotate(${gpsData.heading}deg); transform-origin: center;">
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 5 L30 30 L20 25 L10 30 Z" fill="#00ffe1" stroke="#ffffff" stroke-width="2"/>
          <circle cx="20" cy="20" r="3" fill="#ffffff"/>
        </svg>
      </div>
    `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
    });

    return (
        <Marker position={position} icon={arrowIcon}>
            <Popup>
                <div className="text-sm font-mono">
                    <div className="font-bold text-rover-cyan">NEXUS PRIME</div>
                    <div>Speed: {gpsData.speed.toFixed(1)} km/h</div>
                    <div>Heading: {gpsData.heading.toFixed(0)}°</div>
                </div>
            </Popup>
        </Marker>
    );
}
