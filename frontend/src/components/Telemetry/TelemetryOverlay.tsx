import type { GpsData } from '../../types/rover.types';

interface TelemetryOverlayProps {
    gpsData: GpsData | null;
    connected: boolean;
}

export default function TelemetryOverlay({ gpsData, connected }: TelemetryOverlayProps) {
    return (
        <div className="fixed top-20 right-4 z-40">
            <div className="bg-black/50 backdrop-blur-md border-2 border-rover-cyan rounded-lg p-4 shadow-lg shadow-rover-cyan/25 min-w-[200px]">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-rover-cyan text-sm font-bold tracking-wider">
                        TELEMETRY
                    </h2>
                    <div
                        className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'
                            } animate-pulse`}
                    />
                </div>

                {gpsData ? (
                    <div className="space-y-2 text-white font-mono text-sm">
                        <div className="flex justify-between">
                            <span className="text-rover-cyan/70">Speed:</span>
                            <span className="font-bold">{gpsData.speed.toFixed(1)} km/h</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-rover-cyan/70">Heading:</span>
                            <span className="font-bold">{gpsData.heading.toFixed(0)}°</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-rover-cyan/70">Lat:</span>
                            <span className="text-xs">{gpsData.lat.toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-rover-cyan/70">Lon:</span>
                            <span className="text-xs">{gpsData.lon.toFixed(6)}</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-rover-cyan/50 text-sm text-center">
                        NO DATA
                    </div>
                )}
            </div>
        </div>
    );
}
