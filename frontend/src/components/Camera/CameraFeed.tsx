import { useEffect, useRef, useState, useCallback } from 'react';
import type { YoloObject } from '../../types/rover.types';

interface CameraFeedProps {
    yoloObjects: YoloObject[];
    backendUrl: string;
}

type CamId = 1 | 2;

export default function CameraFeed({ yoloObjects, backendUrl }: CameraFeedProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);

    const [activeCam, setActiveCam] = useState<CamId>(1);
    const [isConnected, setIsConnected] = useState(false);
    const [camUrls, setCamUrls] = useState<{ cam1: string; cam2: string } | null>(null);

    // ── Fetch both camera URLs from backend once ──────────────
    useEffect(() => {
        fetch(`${backendUrl}/config/webrtc-url`)
            .then(r => r.json())
            .then(data => {
                console.log('Camera URLs:', data);
                setCamUrls({ cam1: data.cam1, cam2: data.cam2 });
            })
            .catch(err => console.error('Failed to fetch camera URLs:', err));
    }, [backendUrl]);

    // ── Connect / reconnect WebRTC whenever cam URL changes ───
    const connect = useCallback((url: string) => {
        // Tear down existing connection
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        setIsConnected(false);

        const isHttp = url.startsWith('http://') || url.startsWith('https://');
        const isWs = url.startsWith('ws://') || url.startsWith('wss://');

        console.log(`[CAM] Connecting → ${url}`);

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
            ],
        });
        pcRef.current = pc;

        pc.ontrack = (event) => {
            if (videoRef.current && event.streams[0]) {
                videoRef.current.srcObject = event.streams[0];
                setIsConnected(true);
            }
        };

        pc.onconnectionstatechange = () => {
            setIsConnected(pc.connectionState === 'connected');
        };

        if (isHttp) setupHttp(pc, url);
        else if (isWs) setupWs(pc, url);
    }, []);

    useEffect(() => {
        if (!camUrls) return;
        const url = activeCam === 1 ? camUrls.cam1 : camUrls.cam2;
        connect(url);
        return () => { pcRef.current?.close(); };
    }, [activeCam, camUrls, connect]);

    // ── HTTP signaling ────────────────────────────────────────
    async function setupHttp(pc: RTCPeerConnection, url: string) {
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'offer', sdp: pc.localDescription?.sdp }),
            });
            const data = await res.json();
            if (data.type === 'answer' && data.sdp) {
                await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: data.sdp }));
            }
            pc.onicecandidate = async (e) => {
                if (e.candidate) {
                    await fetch(`${url}/ice`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ candidate: e.candidate }),
                    }).catch(() => { });
                }
            };
        } catch (err) {
            console.error('[CAM] HTTP signaling error:', err);
        }
    }

    // ── WebSocket signaling ───────────────────────────────────
    function setupWs(pc: RTCPeerConnection, url: string) {
        const ws = new WebSocket(url);
        ws.onopen = async () => {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: 'offer', offer }));
        };
        ws.onmessage = async (e) => {
            const msg = JSON.parse(e.data);
            if (msg.type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(msg.answer));
            } else if (msg.type === 'ice-candidate') {
                await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
            }
        };
        pc.onicecandidate = (e) => {
            if (e.candidate && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'ice-candidate', candidate: e.candidate }));
            }
        };
        ws.onerror = (err) => console.error('[CAM] WS error:', err);
    }

    // ── YOLO bounding boxes ───────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        yoloObjects.forEach((obj) => {
            ctx.strokeStyle = '#00ffe1';
            ctx.lineWidth = 2;
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);
            ctx.fillStyle = '#00ffe1';
            ctx.font = '12px monospace';
            ctx.fillText(`${obj.label} (${obj.conf})`, obj.x, obj.y > 15 ? obj.y - 5 : obj.y + 15);
        });
    }, [yoloObjects]);

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="fixed bottom-4 right-4 z-40">
            <div className="bg-black/80 backdrop-blur-md border border-white/15 rounded-2xl overflow-hidden shadow-2xl"
                style={{ boxShadow: '0 0 30px rgba(0,0,0,0.6), 0 0 1px rgba(0,255,225,0.2) inset' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isConnected
                            ? 'bg-green-400 animate-pulse shadow-[0_0_6px_#4ade80]'
                            : 'bg-red-500/70'
                            }`} />
                        <span className="text-xs font-bold tracking-widest text-white">LIVE CAMERA</span>
                    </div>

                    {/* Camera switcher buttons */}
                    <div className="flex gap-1 p-0.5 bg-white/6 rounded-lg border border-white/10">
                        {([1, 2] as CamId[]).map(id => (
                            <button
                                key={id}
                                onClick={() => setActiveCam(id)}
                                className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-md transition-all duration-200 ${activeCam === id
                                    ? 'bg-rover-cyan text-black shadow-[0_0_8px_rgba(0,255,225,0.5)]'
                                    : 'text-white/40 hover:text-white/70'
                                    }`}
                            >
                                CAM {id}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Video area — 16:9 container, any aspect ratio fits perfectly */}
                <div className="relative w-[520px] bg-black" style={{ aspectRatio: '16/9' }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain"
                    />
                    <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    />

                    {/* Status badge */}
                    <div className={`absolute bottom-2 left-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${isConnected
                        ? 'bg-green-500/20 text-green-400 border-green-500/40'
                        : 'bg-black/60 text-white/30 border-white/15'
                        }`}>
                        {isConnected ? '● LIVE' : '○ CONNECTING…'}
                    </div>

                    {/* Camera label badge */}
                    <div className="absolute top-2 right-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/50 border border-white/15 text-white/50">
                        CAM {activeCam}
                    </div>
                </div>
            </div>
        </div>
    );
}
