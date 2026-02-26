import { useEffect, useRef, useState, useCallback } from 'react';

interface CameraFeedProps {
    backendUrl: string;
}

type CamId = 1 | 2;

export default function CameraFeed({ backendUrl }: CameraFeedProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    const [activeCam, setActiveCam] = useState<CamId>(1);
    const [isConnected, setIsConnected] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [camUrls, setCamUrls] = useState<{ cam1: string; cam2: string } | null>(null);

    // ── Fetch both camera URLs from backend once ──────────────
    useEffect(() => {
        fetch(`${backendUrl}/config/webrtc-url`)
            .then(r => r.json())
            .then(data => {
                console.log('Camera URLs:', data);
                setCamUrls({
                    cam1: data.wsUrl || data.cam1,
                    cam2: data.cam2 || data.wsUrl
                });
            })
            .catch(err => console.error('Failed to fetch camera URLs:', err));
    }, [backendUrl]);

    // ── Connect WebRTC logic ───
    const connect = useCallback((url: string) => {
        const isHttp = url.startsWith('http://') || url.startsWith('https://');
        const isWs = url.startsWith('ws://') || url.startsWith('wss://');

        console.log(`[CAM] Connecting → ${url}`);

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject',
                },
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject',
                },
            ],
        });
        pcRef.current = pc;

        pc.ontrack = (event) => {
            if (videoRef.current) {
                if (event.streams && event.streams[0]) {
                    videoRef.current.srcObject = event.streams[0];
                } else {
                    videoRef.current.srcObject = new MediaStream([event.track]);
                }
                videoRef.current.play().catch(e => console.error('Video autoplay failed:', e));
                setIsConnected(true);
            }
        };

        pc.onconnectionstatechange = () => {
            setIsConnected(pc.connectionState === 'connected');
        };

        if (isHttp) setupHttp(pc, url);
        else if (isWs) setupWs(pc, url);
    }, []);

    // ── Stream Switcher with "Breathing Room" Delay ───────────
    useEffect(() => {
        if (!camUrls) return;

        let isCancelled = false;
        const url = activeCam === 1 ? camUrls.cam1 : camUrls.cam2;

        // 1. Immediately tear down any existing connection to free up the Pi's CPU
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        setIsConnected(false);

        // 2. Give the Raspberry Pi 600ms to safely kill the previous camera process
        const connectTimer = setTimeout(() => {
            if (!isCancelled) {
                connect(url);
            }
        }, 600);

        // Cleanup on unmount or when activeCam changes again rapidly
        return () => {
            isCancelled = true;
            clearTimeout(connectTimer);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
        };
    }, [activeCam, camUrls, connect]);

    // ── HTTP signaling ────────────────────────────────────────
    async function setupHttp(pc: RTCPeerConnection, url: string) {
        try {
            pc.addTransceiver('video', { direction: 'recvonly' });

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            await new Promise<void>((resolve) => {
                if (pc.iceGatheringState === 'complete') {
                    resolve();
                } else {
                    const checkState = () => {
                        if (pc.iceGatheringState === 'complete') {
                            pc.removeEventListener('icegatheringstatechange', checkState);
                            resolve();
                        }
                    };
                    pc.addEventListener('icegatheringstatechange', checkState);
                    setTimeout(() => {
                        pc.removeEventListener('icegatheringstatechange', checkState);
                        resolve();
                    }, 500);
                }
            });

            const whepUrl = url.endsWith('/whep') ? url : `${url}/whep`;
            const res = await fetch(whepUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/sdp' },
                body: pc.localDescription?.sdp,
            });

            if (!res.ok) {
                throw new Error(`MediaMTX connection failed: ${res.statusText}`);
            }

            const answerSdp = await res.text();
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: answerSdp }));

        } catch (err) {
            console.error('[CAM] HTTP signaling error:', err);
        }
    }

    // ── WebSocket signaling ───────────────────────────────────
    function setupWs(pc: RTCPeerConnection, url: string) {
        pc.addTransceiver('video', { direction: 'recvonly' });

        const ws = new WebSocket(url);
        wsRef.current = ws;
        ws.onopen = async () => {
            if ((pc.signalingState as string) === 'closed') { ws.close(); return; }
            const offer = await pc.createOffer();
            if ((pc.signalingState as string) === 'closed') { ws.close(); return; }
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: 'offer', sdp: pc.localDescription?.sdp }));
        };
        ws.onmessage = async (e) => {
            const msg = JSON.parse(e.data);
            if (msg.type === 'answer') {
                if ((pc.signalingState as string) === 'closed') return;
                await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.sdp }));
            } else if (msg.type === 'candidate') {
                if ((pc.signalingState as string) === 'closed') return;
                await pc.addIceCandidate(new RTCIceCandidate({
                    candidate: msg.candidate,
                    sdpMid: msg.sdpMid,
                    sdpMLineIndex: msg.sdpMLineIndex
                }));
            }
        };
        pc.onicecandidate = (e) => {
            if (e.candidate && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'candidate',
                    candidate: e.candidate.candidate,
                    sdpMid: e.candidate.sdpMid,
                    sdpMLineIndex: e.candidate.sdpMLineIndex
                }));
            }
        };
        ws.onerror = (err) => console.error('[CAM] WS error:', err);
        ws.onclose = () => console.log('[CAM] WS closed');
    }

    // ── Render ────────────────────────────────────────────────
    return (
        <div className={isExpanded ? "fixed inset-[5px] z-50 transition-all duration-300" : "fixed bottom-4 right-4 z-40 transition-all duration-300"}>
            <div className={`bg-black/80 backdrop-blur-md border border-white/15 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full
                ${isExpanded ? 'w-full' : 'w-[520px]'}`}
                style={{ boxShadow: '0 0 30px rgba(0,0,0,0.6), 0 0 1px rgba(0,255,225,0.2) inset' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 shrink-0">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isConnected
                            ? 'bg-green-400 animate-pulse shadow-[0_0_6px_#4ade80]'
                            : 'bg-red-500/70'
                            }`} />
                        <span className="text-xs font-bold tracking-widest text-white">LIVE CAMERA</span>
                    </div>

                    {/* Header Controls */}
                    <div className="flex gap-3 items-center">
                        {/* Switcher Buttons */}
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

                        {/* Expand Toggle */}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="flex items-center justify-center p-1 px-2.5 bg-white/5 hover:bg-white/15 rounded-lg border border-white/10 text-white/50 hover:text-white transition-colors"
                            title={isExpanded ? "Collapse" : "Expand"}
                        >
                            {isExpanded ? '🗗' : '🗖'}
                        </button>
                    </div>
                </div>

                {/* Video area */}
                <div className="relative bg-black flex-1 min-h-0 w-full flex items-center justify-center" style={isExpanded ? {} : { aspectRatio: '16/9' }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain"
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