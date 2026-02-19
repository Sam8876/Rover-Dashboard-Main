import { useWebSocket } from '../hooks/useWebSocket';
import { useRoverData } from '../hooks/useRoverData';
import Header from './Header';
import MapView from './Map/MapView';
import RadarDisplay from './Radar/RadarDisplay';
import CameraFeed from './Camera/CameraFeed';
import TelemetryOverlay from './Telemetry/TelemetryOverlay';
import DriveControl from './DriveControl/DriveControl';

// Update this URL to your NestJS backend
const BACKEND_URL = 'http://localhost:3000';

export default function Dashboard() {
    const { socket, connected } = useWebSocket(BACKEND_URL);
    const { gpsData, radarData, yoloObjects } = useRoverData(socket);

    return (
        <div className="w-full h-screen bg-rover-dark overflow-hidden">
            <Header />

            <MapView gpsData={gpsData} socket={socket} />

            <TelemetryOverlay gpsData={gpsData} connected={connected} />

            <RadarDisplay radarData={radarData} />

            <CameraFeed yoloObjects={yoloObjects} backendUrl={BACKEND_URL} />

            <DriveControl socket={socket} />
        </div>
    );
}
