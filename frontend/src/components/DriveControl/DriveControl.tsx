import { useEffect, useState, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';

interface DriveControlProps {
    socket: Socket | null;
}

type Direction = 'FORWARD' | 'BACKWARD' | 'LEFT' | 'RIGHT' | 'STOP';

const driveKeyMap: Record<string, Direction> = {
    ArrowUp: 'FORWARD', ArrowDown: 'BACKWARD',
    ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
    KeyW: 'FORWARD', KeyS: 'BACKWARD',
    KeyA: 'LEFT', KeyD: 'RIGHT',
    Space: 'STOP',
};

const DEVICES = [
    { id: 'HEADLIGHT', label: 'HEAD', icon: '💡' },
    { id: 'TAILLIGHT', label: 'TAIL', icon: '🔴' },
    { id: 'DRL', label: 'DRL', icon: '🌟' },
    { id: 'LASER', label: 'LASER', icon: '🎯' },
] as const;

const PT_STEP = 3;    // degrees per tick
const PT_INTERVAL = 50;  // ms between ticks while held

export default function DriveControl({ socket }: DriveControlProps) {
    const [activeDir, setActiveDir] = useState<Direction | null>(null);
    const [pan, setPan] = useState(90);
    const [tilt, setTilt] = useState(90);
    const [activePT, setActivePT] = useState<string | null>(null);
    const [devices, setDevices] = useState<Record<string, boolean>>({
        HEADLIGHT: false, TAILLIGHT: false, DRL: false, LASER: false,
    });

    const panRef = useRef(90);
    const tiltRef = useRef(90);
    const ptIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const sendDrive = useCallback((dir: Direction) => {
        socket?.emit('drive-command', { direction: dir, speed: 200 });
    }, [socket]);

    const sendPanTilt = useCallback((p: number, t: number) => {
        socket?.emit('pantilt-command', { pan: p, tilt: t });
    }, [socket]);

    const adjustPan = useCallback((delta: number) => {
        setPan(prev => {
            const next = Math.max(0, Math.min(180, prev + delta));
            panRef.current = next;
            sendPanTilt(next, tiltRef.current);
            return next;
        });
    }, [sendPanTilt]);

    const adjustTilt = useCallback((delta: number) => {
        setTilt(prev => {
            const next = Math.max(0, Math.min(180, prev + delta));
            tiltRef.current = next;
            sendPanTilt(panRef.current, next);
            return next;
        });
    }, [sendPanTilt]);

    const toggleDevice = useCallback((id: string) => {
        setDevices(prev => {
            const next = !prev[id];
            socket?.emit('device-command', { device: id, state: next ? 1 : 0 });
            return { ...prev, [id]: next };
        });
    }, [socket]);

    // ── Pan/tilt: start repeating interval on press, clear on release ──
    const startPT = useCallback((fn: () => void) => {
        fn(); // fire immediately
        ptIntervalRef.current = setInterval(fn, PT_INTERVAL);
    }, []);

    const stopPT = useCallback(() => {
        if (ptIntervalRef.current) {
            clearInterval(ptIntervalRef.current);
            ptIntervalRef.current = null;
        }
    }, []);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if (e.repeat) return;
        const dir = driveKeyMap[e.code];
        if (dir) { e.preventDefault(); setActiveDir(dir); sendDrive(dir); return; }
        if (e.code === 'KeyQ') { e.preventDefault(); setActivePT('Q'); startPT(() => adjustPan(-PT_STEP)); return; }
        if (e.code === 'KeyE') { e.preventDefault(); setActivePT('E'); startPT(() => adjustPan(+PT_STEP)); return; }
        if (e.code === 'KeyZ') { e.preventDefault(); setActivePT('Z'); startPT(() => adjustTilt(-PT_STEP)); return; }
        if (e.code === 'KeyC') { e.preventDefault(); setActivePT('C'); startPT(() => adjustTilt(+PT_STEP)); return; }
    }, [sendDrive, adjustPan, adjustTilt, startPT]);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        if (driveKeyMap[e.code]) { setActiveDir(null); if (driveKeyMap[e.code] !== 'STOP') sendDrive('STOP'); }
        if (['KeyQ', 'KeyE', 'KeyZ', 'KeyC'].includes(e.code)) { setActivePT(null); stopPT(); }
    }, [sendDrive, stopPT]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            stopPT();
        };
    }, [handleKeyDown, handleKeyUp, stopPT]);

    // ── styled button helpers ──────────────────────────────────
    const driveBtn = (dir: Direction, label: string, area: string) => (
        <button key={dir} style={{ gridArea: area }}
            onMouseDown={() => { setActiveDir(dir); sendDrive(dir); }}
            onMouseUp={() => { setActiveDir(null); sendDrive('STOP'); }}
            onMouseLeave={() => { if (activeDir === dir) { setActiveDir(null); sendDrive('STOP'); } }}
            onTouchStart={e => { e.preventDefault(); setActiveDir(dir); sendDrive(dir); }}
            onTouchEnd={() => { setActiveDir(null); sendDrive('STOP'); }}
            className={`flex items-center justify-center rounded-md font-bold select-none cursor-pointer
                transition-all duration-75 border-2 text-base
                ${activeDir === dir
                    ? 'bg-rover-cyan text-black border-rover-cyan scale-95 shadow-[0_0_10px_rgba(0,255,225,0.6)]'
                    : 'bg-black/50 text-rover-cyan border-rover-cyan/40 hover:border-rover-cyan hover:bg-rover-cyan/10'
                }`}>
            {label}
        </button>
    );

    const ptBtn = (key: 'Q' | 'E' | 'Z' | 'C', top: string, sub: string, onClick: () => void) => (
        <button key={key}
            onMouseDown={() => { setActivePT(key); startPT(onClick); }}
            onMouseUp={() => { setActivePT(null); stopPT(); }}
            onMouseLeave={() => { if (activePT === key) { setActivePT(null); stopPT(); } }}
            onTouchStart={e => { e.preventDefault(); setActivePT(key); startPT(onClick); }}
            onTouchEnd={() => { setActivePT(null); stopPT(); }}
            className={`flex flex-col items-center justify-center rounded-lg py-2 border flex-1
                select-none cursor-pointer transition-all duration-75 gap-0.5
                ${activePT === key
                    ? 'bg-purple-500 text-white border-purple-400 scale-95 shadow-[0_0_8px_rgba(168,85,247,0.6)]'
                    : 'bg-black/50 text-purple-300 border-purple-500/40 hover:border-purple-400 hover:bg-purple-500/10'
                }`}>
            <span className="text-xs font-bold font-mono">{key}</span>
            <span className="text-[8px] text-white/35 leading-none">{top}</span>
            <span className="text-[7px] text-white/20 leading-none">{sub}</span>
        </button>
    );

    return (
        <div className="fixed left-4 z-[9999]" style={{ bottom: '375px' }}>
            <div className="bg-black/75 backdrop-blur-md border border-white/12 rounded-2xl p-3 shadow-xl">

                {/* ── TOP ROW: Drive + Pan/Tilt side by side ─── */}
                <div className="flex gap-4">

                    {/* Drive D-pad */}
                    <div>
                        <p className="text-[8px] font-bold tracking-widest text-white/30 mb-2 text-center">🕹 DRIVE</p>
                        <div style={{
                            display: 'grid',
                            gridTemplateAreas: `". up ." "left stop right" ". down ."`,
                            gridTemplateColumns: 'repeat(3, 40px)',
                            gridTemplateRows: 'repeat(3, 34px)',
                            gap: '3px',
                        }}>
                            {driveBtn('FORWARD', '▲', 'up')}
                            {driveBtn('LEFT', '◀', 'left')}
                            <button style={{ gridArea: 'stop' }}
                                onMouseDown={() => { setActiveDir('STOP'); sendDrive('STOP'); }}
                                onMouseUp={() => setActiveDir(null)}
                                className={`flex items-center justify-center rounded-md text-[8px] font-bold
                                    select-none cursor-pointer border-2 transition-all duration-75
                                    ${activeDir === 'STOP'
                                        ? 'bg-red-500 text-white border-red-400 scale-95'
                                        : 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/30'
                                    }`}>
                                ■ STOP
                            </button>
                            {driveBtn('RIGHT', '▶', 'right')}
                            {driveBtn('BACKWARD', '▼', 'down')}
                        </div>
                        <p className="text-white/15 text-[7px] text-center mt-1.5 font-mono">WASD · ARROWS</p>
                    </div>

                    {/* Divider */}
                    <div className="w-px bg-white/8 self-stretch" />

                    {/* Pan / Tilt */}
                    <div className="flex flex-col justify-between flex-1">
                        <p className="text-[8px] font-bold tracking-widest text-white/30 mb-2 text-center">📷 PAN / TILT</p>

                        {/* Tilt row (top) */}
                        <div>
                            <p className="text-[7px] text-white/20 text-center mb-1">
                                TILT <span className="text-purple-300 font-mono">{tilt}°</span>
                            </p>
                            <div className="flex gap-1.5">
                                {ptBtn('Q', 'TILT', '← LEFT', () => adjustPan(-PT_STEP))}
                                {ptBtn('E', 'TILT', 'RIGHT →', () => adjustPan(+PT_STEP))}
                            </div>
                        </div>

                        {/* Pan row (bottom) */}
                        <div className="mt-2">
                            <p className="text-[7px] text-white/20 text-center mb-1">
                                PAN <span className="text-purple-300 font-mono">{pan}°</span>
                            </p>
                            <div className="flex gap-1.5">
                                {ptBtn('Z', 'PAN', '↓ DOWN', () => adjustTilt(-PT_STEP))}
                                {ptBtn('C', 'PAN', 'UP ↑', () => adjustTilt(+PT_STEP))}
                            </div>
                        </div>

                        <p className="text-white/15 text-[7px] text-center mt-1.5 font-mono">Q/E · Z/C</p>
                    </div>
                </div>

                {/* ── BOTTOM ROW: Devices full width ────────── */}
                <div className="border-t border-white/8 mt-3 pt-2.5">
                    <p className="text-[8px] font-bold tracking-widest text-white/30 mb-2">⚙️ DEVICES</p>
                    <div className="flex gap-2">
                        {DEVICES.map(d => (
                            <button key={d.id}
                                onClick={() => toggleDevice(d.id)}
                                className={`flex-1 flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 border
                                    text-[8px] font-bold select-none cursor-pointer transition-all duration-150
                                    ${devices[d.id]
                                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/60 shadow-[0_0_6px_rgba(251,191,36,0.3)]'
                                        : 'bg-white/4 text-white/30 border-white/10 hover:border-white/25 hover:text-white/50'
                                    }`}>
                                <span className="text-sm">{d.icon}</span>
                                <span>{d.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
