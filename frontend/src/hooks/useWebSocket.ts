import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';

export function useWebSocket(url: string) {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const newSocket = io(url);

        newSocket.on('connect', () => {
            console.log('Connected to NestJS backend');
            setConnected(true);
            // Register as dashboard client
            newSocket.emit('register-dashboard');
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from backend');
            setConnected(false);
        });

        newSocket.on('registered', (data) => {
            console.log('Registered as:', data.role);
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, [url]);

    return { socket, connected };
}
