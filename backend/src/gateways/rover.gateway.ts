import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Inject, forwardRef } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GpsDataDto } from '../dto/gps.dto';
import { RadarDataDto } from '../dto/radar.dto';
import { MqttService } from '../services/mqtt.service';

@WebSocketGateway({
    cors: {
        origin: '*', // Allow all origins for development
    },
})
export class RoverGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        @Inject(forwardRef(() => MqttService))
        private mqttService: MqttService,
    ) { }

    private dashboardClients = new Set<Socket>();
    private roverClients = new Set<Socket>();

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
        this.dashboardClients.delete(client);
        this.roverClients.delete(client);
    }

    // Called by MqttService to push sensor data to all dashboards
    broadcastToDashboards(event: string, data: any) {
        this.dashboardClients.forEach((client) => {
            client.emit(event, data);
        });
    }

    @SubscribeMessage('register-dashboard')
    handleDashboardRegister(@ConnectedSocket() client: Socket) {
        this.dashboardClients.add(client);
        console.log(`Dashboard registered: ${client.id}`);
        return { event: 'registered', data: { role: 'dashboard' } };
    }

    @SubscribeMessage('register-rover')
    handleRoverRegister(@ConnectedSocket() client: Socket) {
        this.roverClients.add(client);
        console.log(`Rover registered: ${client.id}`);
        return { event: 'registered', data: { role: 'rover' } };
    }

    // GPS data from Raspberry Pi/ESP32
    @SubscribeMessage('gps-data')
    handleGpsData(@MessageBody() data: GpsDataDto) {
        // Broadcast to all dashboard clients
        this.dashboardClients.forEach((client) => {
            client.emit('gps-data', data);
        });
    }

    // Radar data from Raspberry Pi
    @SubscribeMessage('radar-data')
    handleRadarData(@MessageBody() data: RadarDataDto) {
        this.dashboardClients.forEach((client) => {
            client.emit('radar-data', data);
        });
    }

    // Camera frame from Raspberry Pi
    @SubscribeMessage('camera-frame')
    handleCameraFrame(@MessageBody() frame: any) {
        this.dashboardClients.forEach((client) => {
            client.emit('camera-frame', frame);
        });
    }

    // YOLO detections
    @SubscribeMessage('yolo-detections')
    handleYoloDetections(@MessageBody() objects: any[]) {
        this.dashboardClients.forEach((client) => {
            client.emit('yolo-detections', objects);
        });
    }

    // Waypoint commands from dashboard to rover
    @SubscribeMessage('add-waypoint')
    handleAddWaypoint(@MessageBody() waypoint: { lat: number; lon: number }) {
        console.log('Waypoint added:', waypoint);
        this.roverClients.forEach((client) => {
            client.emit('add-waypoint', waypoint);
        });
    }

    @SubscribeMessage('remove-waypoint')
    handleRemoveWaypoint(@MessageBody() data: { index: number }) {
        this.roverClients.forEach((client) => {
            client.emit('remove-waypoint', data);
        });
    }

    @SubscribeMessage('clear-waypoints')
    handleClearWaypoints() {
        this.roverClients.forEach((client) => {
            client.emit('clear-waypoints');
        });
    }

    @SubscribeMessage('start-navigation')
    handleStartNavigation(@MessageBody() data: { waypoints: any[] }) {
        console.log('Starting navigation with waypoints:', data.waypoints);
        this.roverClients.forEach((client) => {
            client.emit('start-navigation', data);
        });
    }

    @SubscribeMessage('drive-command')
    handleDriveCommand(@MessageBody() data: { direction: string; speed?: number }) {
        const move = data.direction.toUpperCase(); // e.g. 'FORWARD'
        const speed = data.speed ?? 200;
        console.log(`[DRIVE] ${move} @ ${speed}`);
        this.mqttService.publish('rover/node2/drive', { move, speed });
    }

    @SubscribeMessage('pantilt-command')
    handlePanTilt(@MessageBody() data: { pan?: number; tilt?: number }) {
        console.log('[PANTILT]', data);
        this.mqttService.publish('rover/node2/pantilt', data);
    }

    @SubscribeMessage('device-command')
    handleDevice(@MessageBody() data: { device: string; state: number }) {
        console.log(`[DEVICE] ${data.device} → ${data.state}`);
        this.mqttService.publish('rover/node2/device', data);
    }

    // WebRTC signaling handlers
    @SubscribeMessage('webrtc-offer')
    handleWebRTCOffer(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
        console.log('WebRTC offer received from rover');
        // Forward offer from rover to all dashboards
        this.dashboardClients.forEach((dashboard) => {
            dashboard.emit('webrtc-offer', data);
        });
    }

    @SubscribeMessage('webrtc-answer')
    handleWebRTCAnswer(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
        console.log('WebRTC answer received from dashboard');
        // Forward answer from dashboard to all rovers
        this.roverClients.forEach((rover) => {
            rover.emit('webrtc-answer', data);
        });
    }

    @SubscribeMessage('webrtc-ice-candidate')
    handleICECandidate(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
        // Determine if sender is rover or dashboard, forward to opposite
        if (this.roverClients.has(client)) {
            console.log('ICE candidate from rover → dashboard');
            this.dashboardClients.forEach((dashboard) => {
                dashboard.emit('webrtc-ice-candidate', data);
            });
        } else if (this.dashboardClients.has(client)) {
            console.log('ICE candidate from dashboard → rover');
            this.roverClients.forEach((rover) => {
                rover.emit('webrtc-ice-candidate', data);
            });
        }
    }
}
