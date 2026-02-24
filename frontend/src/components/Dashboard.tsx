import { useWebSocket } from '../hooks/useWebSocket';
import { useRoverData } from '../hooks/useRoverData';
import Header from './Header';
import MapView from './Map/MapView';
import RadarDisplay from './Radar/RadarDisplay';
import CameraFeed from './Camera/CameraFeed';
import TelemetryOverlay from './Telemetry/TelemetryOverlay';
import DriveControl from './DriveControl/DriveControl';

// Dynamically use the same host the page is served from, but dynamically use the port from env
const BACKEND_PORT = import.meta.env.VITE_BACKEND_PORT || '8080';
const BACKEND_URL = `http://${window.location.hostname}:${BACKEND_PORT}`;

export default function Dashboard() {
    const { socket, connected } = useWebSocket(BACKEND_URL);
    const { gpsData, radarData, imuData, envData, powerData } = useRoverData(socket, connected);

    return (
        <div className="w-full h-screen bg-rover-dark overflow-hidden">
            <Header />

            <MapView gpsData={gpsData} socket={socket} />

            <TelemetryOverlay
                gpsData={gpsData}
                imuData={imuData}
                envData={envData}
                powerData={powerData}
                connected={connected}
            />

            <RadarDisplay radarData={radarData} />

            <CameraFeed backendUrl={BACKEND_URL} />

            <DriveControl socket={socket} />
        </div>
    );
}
