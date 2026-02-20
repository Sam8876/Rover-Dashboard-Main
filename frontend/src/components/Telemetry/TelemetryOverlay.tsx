import type { GpsData, ImuData, EnvData, PowerData } from '../../types/rover.types';

interface TelemetryOverlayProps {
    gpsData: GpsData | null;
    imuData: ImuData | null;
    envData: EnvData | null;
    powerData: PowerData | null;
    connected: boolean;
}

function Row({ label, value, unit, highlight }: {
    label: string;
    value: string;
    unit?: string;
    highlight?: 'warn' | 'good' | 'danger';
}) {
    const valueColor =
        highlight === 'warn' ? 'text-yellow-400' :
            highlight === 'danger' ? 'text-red-400' :
                highlight === 'good' ? 'text-green-400' :
                    'text-white';

    return (
        <div className="flex items-center justify-between py-[3px]">
            <span className="text-rover-cyan/50 text-[11px] font-mono">{label}</span>
            <span className={`text-[11px] font-mono font-bold ${valueColor}`}>
                {value}
                {unit && <span className="text-rover-cyan/30 font-normal ml-0.5">{unit}</span>}
            </span>
        </div>
    );
}

function Divider({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2 pt-2 pb-1">
            <div className="flex-1 h-px bg-rover-cyan/15" />
            <span className="text-rover-cyan/40 text-[9px] font-bold tracking-widest whitespace-nowrap">{label}</span>
            <div className="flex-1 h-px bg-rover-cyan/15" />
        </div>
    );
}

// Bar indicator for values with a max
function Bar({ value, max, warn, danger }: { value: number; max: number; warn?: number; danger?: number }) {
    const pct = Math.min((value / max) * 100, 100);
    const color =
        danger && value >= danger ? 'bg-red-500' :
            warn && value >= warn ? 'bg-yellow-400' :
                'bg-rover-cyan';
    return (
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-0.5 mb-1">
            <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
        </div>
    );
}

export default function TelemetryOverlay({ gpsData, imuData, envData, powerData, connected }: TelemetryOverlayProps) {
    const hasAnyData = gpsData || imuData || envData || powerData;

    return (
        <div className="fixed top-20 right-4 z-[9999] w-[220px]">
            <div className="bg-black/75 backdrop-blur-md border border-rover-cyan/30 rounded-xl overflow-hidden shadow-xl shadow-black/50">

                {/* ── Header ─────────────────────────────── */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-rover-cyan/15 bg-rover-cyan/5">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shadow-lg ${connected
                                ? 'bg-green-400 shadow-green-400/50 animate-pulse'
                                : 'bg-red-500 shadow-red-500/50'
                            }`} />
                        <h2 className="text-rover-cyan text-[11px] font-bold tracking-widest">TELEMETRY</h2>
                    </div>
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${connected
                            ? 'text-green-400 border-green-400/30 bg-green-400/10'
                            : 'text-red-400 border-red-400/30 bg-red-400/10'
                        }`}>
                        {connected ? 'ONLINE' : 'OFFLINE'}
                    </span>
                </div>

                <div className="px-3 pb-3">

                    {/* ── GPS ──────────────────────────────── */}
                    <Divider label="GPS · GSM" />
                    {gpsData ? (<>
                        <Row label="Latitude" value={gpsData.lat.toFixed(6)} />
                        <Row label="Longitude" value={gpsData.lon.toFixed(6)} />
                        <Row label="Speed" value={gpsData.speed.toFixed(1)} unit="km/h" />
                        <Row label="Heading" value={`${gpsData.heading.toFixed(0)}°`} />
                        {gpsData.satellites !== undefined && (
                            <Row label="Satellites" value={String(gpsData.satellites)}
                                highlight={gpsData.satellites >= 4 ? 'good' : 'warn'} />
                        )}
                    </>) : (
                        <p className="text-rover-cyan/25 text-[10px] text-center py-1 font-mono">Waiting for GPS fix...</p>
                    )}

                    {/* ── IMU ──────────────────────────────── */}
                    <Divider label="IMU · MPU6050" />
                    {imuData ? (<>
                        <Row label="Roll" value={imuData.roll.toFixed(1)} unit="°"
                            highlight={Math.abs(imuData.roll) > 30 ? 'danger' : Math.abs(imuData.roll) > 15 ? 'warn' : undefined} />
                        <Row label="Pitch" value={imuData.pitch.toFixed(1)} unit="°"
                            highlight={Math.abs(imuData.pitch) > 30 ? 'danger' : Math.abs(imuData.pitch) > 15 ? 'warn' : undefined} />
                        <Row label="Yaw" value={imuData.yaw.toFixed(1)} unit="°" />
                    </>) : (
                        <p className="text-rover-cyan/25 text-[10px] text-center py-1 font-mono">No IMU data</p>
                    )}

                    {/* ── Environment ──────────────────────── */}
                    <Divider label="ENV · DHT22 · BH1750" />
                    {envData ? (<>
                        <Row label="Temperature" value={envData.temperature.toFixed(1)} unit="°C"
                            highlight={envData.temperature > 60 ? 'danger' : envData.temperature > 45 ? 'warn' : undefined} />
                        <Bar value={envData.temperature} max={80} warn={45} danger={60} />
                        <Row label="Humidity" value={envData.humidity.toFixed(1)} unit="%" />
                        <Bar value={envData.humidity} max={100} warn={80} danger={95} />
                        <Row label="Lux" value={envData.lux.toFixed(0)} unit="lx" />
                    </>) : (
                        <p className="text-rover-cyan/25 text-[10px] text-center py-1 font-mono">No env data</p>
                    )}

                    {/* ── Power ────────────────────────────── */}
                    <Divider label="POWER · INA219" />
                    {powerData ? (<>
                        <div className="grid grid-cols-2 gap-x-3">
                            <div>
                                <p className="text-rover-cyan/30 text-[8px] tracking-widest mb-0.5">SOLAR</p>
                                <Row label="V" value={powerData.solarV.toFixed(2)} unit="V"
                                    highlight={powerData.solarV > 11 ? 'good' : 'warn'} />
                                <Row label="I" value={String(powerData.solarI)} unit="mA" />
                                {powerData.solarW !== undefined && (
                                    <Row label="W" value={powerData.solarW.toFixed(1)} unit="W" highlight="good" />
                                )}
                            </div>
                            <div>
                                <p className="text-rover-cyan/30 text-[8px] tracking-widest mb-0.5">LOAD</p>
                                <Row label="V" value={powerData.loadV.toFixed(2)} unit="V"
                                    highlight={powerData.loadV < 10.5 ? 'danger' : powerData.loadV < 11.2 ? 'warn' : undefined} />
                                <Row label="I" value={String(powerData.loadI)} unit="mA" />
                                {powerData.loadW !== undefined && (
                                    <Row label="W" value={powerData.loadW.toFixed(1)} unit="W" />
                                )}
                            </div>
                        </div>
                    </>) : (
                        <p className="text-rover-cyan/25 text-[10px] text-center py-1 font-mono">No power data</p>
                    )}

                    {/* No data at all */}
                    {!hasAnyData && connected && (
                        <p className="text-rover-cyan/30 text-[10px] text-center pt-1 font-mono animate-pulse">
                            Waiting for sensor data...
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
