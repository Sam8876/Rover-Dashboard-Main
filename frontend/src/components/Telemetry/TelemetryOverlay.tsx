import { useEffect, useRef, useState } from 'react';
import type { GpsData, ImuData, EnvData, PowerData } from '../../types/rover.types';

interface TelemetryOverlayProps {
    gpsData: GpsData | null;
    imuData: ImuData | null;
    envData: EnvData | null;
    powerData: PowerData | null;
    connected: boolean;
}

// ── Flash cyan on value change ─────────────────────────────────
function AnimVal({ value, dec = 1 }: { value: number; dec?: number }) {
    const ref = useRef<HTMLSpanElement>(null);
    const prev = useRef(value);
    useEffect(() => {
        if (!ref.current || prev.current === value) return;
        prev.current = value;
        ref.current.style.color = '#00ffe1';
        setTimeout(() => { if (ref.current) ref.current.style.color = ''; }, 350);
    }, [value]);
    return <span ref={ref} className="transition-colors duration-300">{value.toFixed(dec)}</span>;
}

// ── Progress bar ───────────────────────────────────────────────
function Bar({ value, max, warn = 70, danger = 90 }: {
    value: number; max: number; warn?: number; danger?: number;
}) {
    const pct = Math.min((value / max) * 100, 100);
    const color = pct >= (danger / max) * 100 ? '#ef4444'
        : pct >= (warn / max) * 100 ? '#f59e0b' : '#00ffe1';
    return (
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden my-1.5">
            <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}88` }} />
        </div>
    );
}

// ── Tilt arc ───────────────────────────────────────────────────
function TiltArc({ value, max = 45, label }: { value: number; max?: number; label: string }) {
    const pct = (Math.max(-max, Math.min(max, value)) / max) * 50;
    const color = Math.abs(value) > 30 ? '#ef4444'
        : Math.abs(value) > 15 ? '#f59e0b' : '#00ffe1';
    return (
        <div className="flex items-center gap-2 py-1">
            <span className="text-xs font-mono text-white/40 w-8 shrink-0">{label}</span>
            <div className="relative flex-1 h-[3px] bg-white/10 rounded-full">
                <div className="absolute top-1/2 left-1/2 w-px h-3 -translate-x-1/2 -translate-y-1/2 bg-white/20" />
                <div className="absolute top-1/2 w-3 h-3 rounded-full border-2 transition-all duration-300"
                    style={{
                        left: `calc(50% + ${pct}%)`,
                        transform: 'translate(-50%,-50%)',
                        borderColor: color,
                        backgroundColor: `${color}22`,
                        boxShadow: `0 0 6px ${color}`,
                    }} />
            </div>
            <span className="text-sm font-mono font-bold w-12 text-right shrink-0" style={{ color }}>
                {value.toFixed(1)}°
            </span>
        </div>
    );
}

// ── Label : Value row ──────────────────────────────────────────
function Row({ label, children, unit, color }: {
    label: string; children: React.ReactNode; unit?: string; color?: string;
}) {
    return (
        <div className="flex items-center justify-between py-[3px]">
            <span className="text-xs font-mono text-white/40">{label}</span>
            <div className="flex items-baseline gap-1">
                <span className="text-sm font-mono font-semibold text-white" style={color ? { color } : {}}>
                    {children}
                </span>
                {unit && <span className="text-[10px] text-white/25">{unit}</span>}
            </div>
        </div>
    );
}

// ── Individual collapsible card ────────────────────────────────
function Card({ icon, title, children }: {
    icon: string; title: string; children: React.ReactNode;
}) {
    const [open, setOpen] = useState(true);
    return (
        <div className="rounded-xl border border-white/10 overflow-hidden"
            style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(20px)' }}>
            {/* Header */}
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-white/5 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm leading-none">{icon}</span>
                    <span className="text-[10px] font-bold tracking-widest text-white/70 uppercase">{title}</span>
                </div>
                <span className={`text-white/30 text-[10px] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>
            {/* Collapsible body */}
            <div style={{
                maxHeight: open ? '300px' : '0px',
                opacity: open ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 0.25s ease, opacity 0.2s ease',
            }}>
                <div className="border-t border-white/8 px-3.5 pt-2.5 pb-3">
                    {children}
                </div>
            </div>
        </div>
    );
}

// ══ Main Component ══════════════════════════════════════════════
export default function TelemetryOverlay({
    gpsData, imuData, envData, powerData, connected,
}: TelemetryOverlayProps) {
    return (
        <div className="fixed top-4 right-4 z-[9999] w-[420px]">

            {/* ── Status bar ─────────────────────────────────── */}
            <div className="flex items-center justify-end gap-2 mb-2">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold ${connected
                        ? 'text-green-400 border-green-400/40 bg-black/80 shadow-[0_0_10px_#4ade8033]'
                        : 'text-red-400 border-red-400/40 bg-black/80'
                    }`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${connected
                            ? 'bg-green-400 animate-pulse shadow-[0_0_6px_#4ade80]'
                            : 'bg-red-500 shadow-[0_0_6px_#ef4444]'
                        }`} />
                    {connected ? 'ONLINE' : 'OFFLINE'}
                </div>
            </div>

            {/* ── 2×2 Grid of cards ──────────────────────────── */}
            <div className="grid grid-cols-2 gap-2">

                {/* GPS */}
                <Card icon="📡" title="GPS · GSM">
                    {gpsData ? (
                        <div className="space-y-0.5">
                            <Row label="Lat" unit="°N">{gpsData.lat.toFixed(5)}</Row>
                            <Row label="Lon" unit="°E">{gpsData.lon.toFixed(5)}</Row>
                            <Row label="Speed" unit="km/h">
                                <AnimVal value={gpsData.speed} dec={1} />
                            </Row>
                            <Row label="Hdg" unit="°">{gpsData.heading.toFixed(0)}</Row>
                            {gpsData.satellites !== undefined && (
                                <Row label="Sats"
                                    color={gpsData.satellites >= 4 ? '#4ade80' : '#f59e0b'}>
                                    {gpsData.satellites}
                                </Row>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-white/25 font-mono animate-pulse">Waiting for fix…</p>
                    )}
                </Card>

                {/* IMU */}
                <Card icon="🔵" title="IMU · MPU6050">
                    {imuData ? (
                        <div>
                            <TiltArc value={imuData.roll} label="Roll" />
                            <TiltArc value={imuData.pitch} label="Pitch" />
                            <Row label="Yaw" unit="°">
                                <AnimVal value={imuData.yaw} dec={1} />
                            </Row>
                        </div>
                    ) : (
                        <p className="text-xs text-white/25 font-mono animate-pulse">No IMU data</p>
                    )}
                </Card>

                {/* ENV */}
                <Card icon="🌡️" title="ENV · DHT22">
                    {envData ? (
                        <div>
                            <Row label="Temp" unit="°C"
                                color={envData.temperature > 60 ? '#ef4444'
                                    : envData.temperature > 45 ? '#f59e0b' : undefined}>
                                <AnimVal value={envData.temperature} dec={1} />
                            </Row>
                            <Bar value={envData.temperature} max={80} warn={45} danger={60} />
                            <Row label="Hum" unit="%">
                                <AnimVal value={envData.humidity} dec={1} />
                            </Row>
                            <Bar value={envData.humidity} max={100} warn={80} danger={95} />
                            <Row label="Lux" unit="lx">{envData.lux.toFixed(0)}</Row>
                        </div>
                    ) : (
                        <p className="text-xs text-white/25 font-mono animate-pulse">No env data</p>
                    )}
                </Card>

                {/* Power */}
                <Card icon="⚡" title="Power · INA219">
                    {powerData ? (
                        <div className="flex gap-2">
                            {/* Solar */}
                            <div className="flex-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5">
                                <p className="text-[9px] tracking-widest font-bold text-white/30 mb-1.5">SOLAR</p>
                                <Row label="V">
                                    {powerData.solarV.toFixed(2)}
                                    <span className="text-[10px] text-white/20 ml-0.5">V</span>
                                </Row>
                                <Row label="I">
                                    {Math.round(powerData.solarI)}
                                    <span className="text-[10px] text-white/20 ml-0.5">mA</span>
                                </Row>
                                <Row label="W">
                                    <span className="text-green-400">{powerData.solarW?.toFixed(1)}</span>
                                    <span className="text-[10px] text-white/20 ml-0.5">W</span>
                                </Row>
                            </div>
                            {/* Load */}
                            <div className="flex-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5">
                                <p className="text-[9px] tracking-widest font-bold text-white/30 mb-1.5">LOAD</p>
                                <Row label="V"
                                    color={powerData.loadV < 10.5 ? '#ef4444'
                                        : powerData.loadV < 11.2 ? '#f59e0b' : undefined}>
                                    {powerData.loadV.toFixed(2)}
                                    <span className="text-[10px] text-white/20 ml-0.5">V</span>
                                </Row>
                                <Row label="I">
                                    {Math.round(powerData.loadI)}
                                    <span className="text-[10px] text-white/20 ml-0.5">mA</span>
                                </Row>
                                <Row label="W">
                                    <span className="text-green-400">{powerData.loadW?.toFixed(1)}</span>
                                    <span className="text-[10px] text-white/20 ml-0.5">W</span>
                                </Row>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-white/25 font-mono animate-pulse">No power data</p>
                    )}
                </Card>
            </div>
        </div>
    );
}
