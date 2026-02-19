import { useEffect, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

interface DriveControlProps {
    socket: Socket | null;
}

type Direction = 'forward' | 'backward' | 'left' | 'right' | 'stop';

const keyMap: Record<string, Direction> = {
    ArrowUp: 'forward',
    ArrowDown: 'backward',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    KeyW: 'forward',
    KeyS: 'backward',
    KeyA: 'left',
    KeyD: 'right',
    Space: 'stop',
};

export default function DriveControl({ socket }: DriveControlProps) {
    const [activeKey, setActiveKey] = useState<Direction | null>(null);

    const sendCommand = useCallback((direction: Direction) => {
        if (!socket) return;
        socket.emit('drive-command', { direction });
    }, [socket]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        const dir = keyMap[e.code];
        if (!dir || e.repeat) return;
        e.preventDefault();
        setActiveKey(dir === 'stop' ? 'stop' : dir);
        sendCommand(dir);
    }, [sendCommand]);

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
        const dir = keyMap[e.code];
        if (!dir) return;
        setActiveKey(null);
        if (dir !== 'stop') sendCommand('stop');
    }, [sendCommand]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [handleKeyDown, handleKeyUp]);

    const btn = (dir: Direction, label: string, gridArea: string) => (
        <button
            key={dir}
            style={{ gridArea }}
            onMouseDown={() => { setActiveKey(dir); sendCommand(dir); }}
            onMouseUp={() => { setActiveKey(null); sendCommand('stop'); }}
            onMouseLeave={() => { if (activeKey === dir) { setActiveKey(null); sendCommand('stop'); } }}
            onTouchStart={(e) => { e.preventDefault(); setActiveKey(dir); sendCommand(dir); }}
            onTouchEnd={() => { setActiveKey(null); sendCommand('stop'); }}
            className={`flex items-center justify-center rounded-md text-base font-bold
                select-none cursor-pointer transition-all duration-75 border-2
                ${activeKey === dir
                    ? 'bg-rover-cyan text-black border-rover-cyan scale-95 shadow-[0_0_12px_rgba(0,255,225,0.7)]'
                    : 'bg-black/50 text-rover-cyan border-rover-cyan/40 hover:border-rover-cyan hover:bg-rover-cyan/10'
                }`}
        >
            {label}
        </button>
    );

    return (
        <div className="fixed left-4 z-[9999]" style={{ bottom: '375px' }}>
            <div className="bg-black/60 backdrop-blur-md border border-rover-cyan/40 rounded-xl p-3 shadow-lg shadow-rover-cyan/20">
                {/* Title */}
                <h2 className="text-rover-cyan text-xs font-bold tracking-widest mb-2">DRIVE CONTROL</h2>

                {/* D-pad */}
                <div style={{
                    display: 'grid',
                    gridTemplateAreas: `". up ." "left stop right" ". down ."`,
                    gridTemplateColumns: 'repeat(3, 48px)',
                    gridTemplateRows: 'repeat(3, 40px)',
                    gap: '4px',
                }}>
                    {btn('forward', '▲', 'up')}
                    {btn('left', '◀', 'left')}

                    {/* Stop */}
                    <button
                        style={{ gridArea: 'stop' }}
                        onMouseDown={() => { setActiveKey('stop'); sendCommand('stop'); }}
                        onMouseUp={() => setActiveKey(null)}
                        className={`flex items-center justify-center rounded-md text-[11px] font-bold
                            select-none cursor-pointer border-2 transition-all duration-75
                            ${activeKey === 'stop'
                                ? 'bg-red-500 text-white border-red-400 scale-95 shadow-[0_0_10px_rgba(239,68,68,0.7)]'
                                : 'bg-red-500/20 text-red-400 border-red-500/50 hover:bg-red-500/40 hover:border-red-400'
                            }`}
                    >
                        ■ STOP
                    </button>

                    {btn('right', '▶', 'right')}
                    {btn('backward', '▼', 'down')}
                </div>

                {/* Keyboard hint */}
                <p className="text-rover-cyan/30 text-[9px] text-center mt-2 font-mono tracking-wider">
                    WASD · ARROWS · SPACE=STOP
                </p>
            </div>
        </div>
    );
}
