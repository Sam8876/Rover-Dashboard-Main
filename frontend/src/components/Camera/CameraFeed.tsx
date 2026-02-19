import { useEffect, useRef, useState } from 'react';
import type { YoloObject } from '../../types/rover.types';

interface CameraFeedProps {
    yoloObjects: YoloObject[];
    backendUrl: string;
}

export default function CameraFeed({ yoloObjects, backendUrl }: CameraFeedProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [webrtcUrl, setWebrtcUrl] = useState<string>('');

    // Fetch WebRTC URL from backend
    useEffect(() => {
        fetch(`${backendUrl}/config/webrtc-url`)
            .then(res => res.json())
            .then(data => {
                console.log('WebRTC URL from backend:', data.url);
                setWebrtcUrl(data.url);
            })
            .catch(err => console.error('Failed to fetch WebRTC URL:', err));
    }, [backendUrl]);

    // Setup WebRTC connection with HTTP or WebSocket signaling
    useEffect(() => {
        if (!webrtcUrl) return;

        const isHttpProtocol = webrtcUrl.startsWith('http://') || webrtcUrl.startsWith('https://');
        const isWebSocket = webrtcUrl.startsWith('ws://') || webrtcUrl.startsWith('wss://');

        console.log(`Connecting to Pi WebRTC server: ${webrtcUrl}`);
        console.log(`Protocol: ${isHttpProtocol ? 'HTTP API' : isWebSocket ? 'WebSocket' : 'Unknown'}`);

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        });

        // Handle incoming media stream
        pc.ontrack = (event) => {
            console.log('WebRTC track received:', event.track.kind);
            if (videoRef.current && event.streams[0]) {
                videoRef.current.srcObject = event.streams[0];
                setIsConnected(true);
            }
        };

        // Connection state monitoring
        pc.onconnectionstatechange = () => {
            console.log('WebRTC connection state:', pc.connectionState);
            setIsConnected(pc.connectionState === 'connected');
        };

        if (isHttpProtocol) {
            // HTTP-based signaling
            setupHttpSignaling(pc, webrtcUrl);
        } else if (isWebSocket) {
            // WebSocket-based signaling
            setupWebSocketSignaling(pc, webrtcUrl);
        }

        return () => {
            console.log('Cleaning up WebRTC connection');
            pc.close();
        };
    }, [webrtcUrl]);

    // HTTP-based WebRTC signaling
    const setupHttpSignaling = async (pc: RTCPeerConnection, url: string) => {
        try {
            // Create offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            console.log('Sending offer to Pi via HTTP POST...');

            // Send offer to Pi and get answer via HTTP
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 'offer',
                    sdp: pc.localDescription?.sdp
                })
            });

            const data = await response.json();
            console.log('Received answer from Pi:', data);

            if (data.type === 'answer' && data.sdp) {
                await pc.setRemoteDescription(new RTCSessionDescription({
                    type: 'answer',
                    sdp: data.sdp
                }));
                console.log('✅ HTTP WebRTC signaling completed');
            }

            // Handle ICE candidates
            pc.onicecandidate = async (event) => {
                if (event.candidate) {
                    // Send ICE candidate via HTTP
                    await fetch(`${url}/ice`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ candidate: event.candidate })
                    }).catch(err => console.log('ICE candidate send failed:', err));
                }
            };

        } catch (error) {
            console.error('HTTP signaling error:', error);
        }
    };

    // WebSocket-based WebRTC signaling
    const setupWebSocketSignaling = (pc: RTCPeerConnection, url: string) => {
        const ws = new WebSocket(url);

        ws.onopen = async () => {
            console.log('WebSocket connected to Pi');

            // Create and send offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: 'offer', offer }));
        };

        ws.onmessage = async (event) => {
            const message = JSON.parse(event.data);

            if (message.type === 'answer') {
                console.log('Received answer from Pi');
                await pc.setRemoteDescription(new RTCSessionDescription(message.answer));
            } else if (message.type === 'ice-candidate') {
                await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate
                }));
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };
    };

    // Draw YOLO bounding boxes on canvas overlay
    useEffect(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize canvas to match video
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw YOLO bounding boxes
        yoloObjects.forEach((obj) => {
            ctx.strokeStyle = '#00ffe1';
            ctx.lineWidth = 2;
            ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

            ctx.fillStyle = '#00ffe1';
            ctx.font = '12px monospace';
            ctx.fillText(
                `${obj.label} (${obj.conf})`,
                obj.x,
                obj.y > 15 ? obj.y - 5 : obj.y + 15
            );
        });
    }, [yoloObjects]);

    return (
        <div className="fixed bottom-4 right-4 z-40">
            <div className="bg-black/30 backdrop-blur-md border-2 border-rover-cyan rounded-lg p-4 shadow-lg shadow-rover-cyan/25">
                <h2 className="text-rover-cyan text-lg font-bold mb-2 tracking-wider">
                    LIVE CAMERA
                </h2>
                <div className="relative w-[400px] h-[300px] bg-black rounded overflow-hidden border border-rover-cyan">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                    <canvas
                        ref={canvasRef}
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    />
                    <div className={`absolute bottom-2 right-2 text-xs px-2 py-1 rounded border ${isConnected
                        ? 'bg-green-500/60 text-white border-green-500'
                        : 'bg-black/60 text-rover-cyan/50 border-rover-cyan/50'
                        }`}>
                        {isConnected ? 'LIVE' : 'CONNECTING...'}
                    </div>
                </div>
            </div>
        </div>
    );
}
