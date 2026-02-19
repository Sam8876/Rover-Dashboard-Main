import { useEffect, useRef } from 'react';
import type { RadarData } from '../../types/rover.types';

interface RadarDisplayProps {
    radarData: RadarData | null;
}

export default function RadarDisplay({ radarData }: RadarDisplayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const targetsRef = useRef({
        front: { d: 999, a: 1 },
        right: { d: 999, a: 1 },
        back: { d: 999, a: 1 },
        left: { d: 999, a: 1 },
    });
    const sweepAngleRef = useRef(0);
    const lastTimeRef = useRef(performance.now());

    const SIZE = 280;
    const R = SIZE / 2;

    const dirs = {
        front: -Math.PI / 2,
        right: 0,
        back: Math.PI / 2,
        left: Math.PI,
    };

    const smooth = (prev: number, next: number, f = 0.12) => {
        return prev + (next - prev) * f;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const radarLoop = (t: number) => {
            const dt = t - lastTimeRef.current;
            lastTimeRef.current = t;

            ctx.clearRect(0, 0, SIZE, SIZE);
            ctx.save();
            ctx.translate(R, R);

            // Draw circular grid
            ctx.strokeStyle = 'rgba(0,255,225,0.25)';
            ctx.lineWidth = 1;
            [40, 80, 120].forEach((r) => {
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.stroke();
            });

            // Draw sweep line
            const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 130);
            grad.addColorStop(0, 'rgba(0,255,225,0.8)');
            grad.addColorStop(1, 'rgba(0,255,225,0)');

            ctx.strokeStyle = grad;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(
                Math.cos(sweepAngleRef.current) * 130,
                Math.sin(sweepAngleRef.current) * 130
            );
            ctx.stroke();

            // Update and draw targets
            if (radarData) {
                Object.keys(dirs).forEach((dir) => {
                    const key = dir as keyof typeof dirs;
                    const raw = radarData[key];

                    if (raw > 5 && raw < 120) {
                        targetsRef.current[key].d = smooth(targetsRef.current[key].d, raw);
                        targetsRef.current[key].a = 1;
                    } else {
                        targetsRef.current[key].a *= 0.93;
                    }

                    if (targetsRef.current[key].a < 0.05) return;

                    const d = targetsRef.current[key].d;
                    const a = dirs[key];
                    const color =
                        d < 50 ? '255,60,60' : d < 80 ? '255,170,0' : '0,255,136';

                    ctx.fillStyle = `rgba(${color},${targetsRef.current[key].a})`;
                    ctx.shadowColor = `rgba(${color},0.9)`;
                    ctx.shadowBlur = 12;

                    ctx.beginPath();
                    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 6, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            ctx.shadowBlur = 0;
            ctx.restore();

            sweepAngleRef.current += dt * 0.002;
            if (sweepAngleRef.current > Math.PI * 2) sweepAngleRef.current -= Math.PI * 2;

            requestAnimationFrame(radarLoop);
        };

        const animationId = requestAnimationFrame(radarLoop);

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [radarData]);

    return (
        <div className="fixed bottom-4 left-4 z-40">
            <div className="bg-black/30 backdrop-blur-md border-2 border-rover-cyan rounded-lg p-4 shadow-lg shadow-rover-cyan/25">
                <h2 className="text-rover-cyan text-lg font-bold mb-2 tracking-wider">
                    360° RADAR
                </h2>
                <canvas
                    ref={canvasRef}
                    width={SIZE}
                    height={SIZE}
                    className="rounded"
                />
            </div>
        </div>
    );
}
