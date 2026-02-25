import { Injectable, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { RoverGateway } from '../gateways/rover.gateway';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
    private client: mqtt.MqttClient;
    private gpsClient?: mqtt.MqttClient;

    constructor(
        private configService: ConfigService,
        @Inject(forwardRef(() => RoverGateway))
        private roverGateway: RoverGateway,
    ) { }

    onModuleInit() {
        const brokerUrl = this.configService.get<string>('MQTT_BROKER_URL', 'mqtt://localhost:1883');
        const gpsBrokerUrl = this.configService.get<string>('MQTT_GPS_URL');

        console.log(`[MQTT] Connecting to main broker: ${brokerUrl}`);

        this.client = mqtt.connect(brokerUrl, {
            clientId: `nexus-backend-${Date.now()}`,
            clean: true,
            reconnectPeriod: 3000,
        });

        this.client.on('connect', () => {
            console.log('✅ Connected to main MQTT broker');
            const mainTopics = [
                // Sensor ESP32 — all-in-one topic (actual ESP32 topic)
                'rover/node1/data',
                'rover/+/data',

                // Sensor ESP32 — individual topics (if split later)
                'rover/ultrasonic',
                'rover/imu',
                'rover/env',
                'rover/power',

                // Actuator ESP32
                'rover/actuator/status',

                // Legacy
                'rover/sensor',
            ];

            // If no separate GPS URL, handle GPS on the main broker
            if (!gpsBrokerUrl) {
                mainTopics.push('rover/gps');
                mainTopics.push('rover/+/gps');
            }

            this.client.subscribe(mainTopics, (err) => {
                if (err) console.error('MQTT subscribe error:', err);
                else console.log('📡 Subscribed to main rover MQTT topics');
            });
        });

        this.client.on('message', (topic, payload) => {
            const raw = payload.toString();
            console.log(`[MQTT-Main] ${topic}: ${raw}`);
            let data: any;
            try { data = JSON.parse(raw); } catch { data = this.parsePlainString(raw); }
            this.routeMessage(topic, data);
        });

        this.client.on('error', (err) => console.error('MQTT error:', err.message));
        this.client.on('reconnect', () => console.log('🔄 MQTT reconnecting...'));

        // ── Secondary broker for GPS (Optional) ──
        if (gpsBrokerUrl) {
            console.log(`[MQTT] Connecting to GPS broker: ${gpsBrokerUrl}`);
            this.gpsClient = mqtt.connect(gpsBrokerUrl, {
                clientId: `nexus-gps-${Date.now()}`,
                clean: true,
                reconnectPeriod: 3000,
            });

            this.gpsClient.on('connect', () => {
                console.log('✅ Connected to GPS MQTT broker');
                this.gpsClient!.subscribe(['rover/gps', 'rover/+/gps'], (err) => {
                    if (err) console.error('GPS MQTT subscribe error:', err);
                    else console.log('📡 Subscribed to rover/gps and rover/+/gps on GPS broker');
                });
            });

            this.gpsClient.on('message', (topic, payload) => {
                const raw = payload.toString();
                console.log(`[MQTT-GPS] ${topic}: ${raw}`);
                let data: any;
                try { data = JSON.parse(raw); } catch { data = this.parsePlainString(raw); }
                this.routeMessage(topic, data);
            });

            this.gpsClient.on('error', (err) => console.error('GPS MQTT error:', err.message));
            this.gpsClient.on('reconnect', () => console.log('🔄 GPS MQTT reconnecting...'));
        }
    }

    private routeMessage(topic: string, data: any) {
        switch (topic) {

            // ─── Sensor ESP32 ─────────────────────────────────────────
            case 'rover/ultrasonic':
                // { front, right, back, left } in cm
                this.roverGateway.broadcastToDashboards('radar-data', {
                    front: parseFloat(data.front ?? 999),
                    right: parseFloat(data.right ?? 999),
                    back: parseFloat(data.back ?? 999),
                    left: parseFloat(data.left ?? 999),
                });
                break;

            case 'rover/imu':
                // { roll, pitch, yaw } in degrees
                this.roverGateway.broadcastToDashboards('imu-data', {
                    roll: parseFloat(data.roll ?? 0),
                    pitch: parseFloat(data.pitch ?? 0),
                    yaw: parseFloat(data.yaw ?? 0),
                });
                break;

            case 'rover/env':
                // { temperature, humidity, lux }
                this.roverGateway.broadcastToDashboards('env-data', {
                    temperature: parseFloat(data.temperature ?? data.temp ?? 0),
                    humidity: parseFloat(data.humidity ?? data.hum ?? 0),
                    lux: parseFloat(data.lux ?? 0),
                });
                break;

            case 'rover/power':
                // { voltage, current } — power calculated here
                const voltage = parseFloat(data.voltage ?? data.v ?? 0);
                const current = parseFloat(data.current ?? data.i ?? 0);
                this.roverGateway.broadcastToDashboards('power-data', {
                    voltage,
                    current,
                    power: parseFloat((voltage * current).toFixed(2)),
                });
                break;

            // ─── GPS-GSM ESP32 ────────────────────────────────────────
            case 'rover/gps':
            case 'rover/node2/gps':
                this.roverGateway.broadcastToDashboards('gps-data', {
                    lat: parseFloat(data.lat ?? 0),
                    lon: parseFloat(data.lon ?? data.long ?? 0),
                    speed: parseFloat(data.speed ?? 0),
                    heading: parseFloat(data.direction ?? data.heading ?? 0),
                    active: data.active,
                    sos: data.sos,
                    satellites: parseInt(data.satellites ?? 0), // Defaulting to 0 if absent
                    signal: parseInt(data.signal ?? 0), // Defaulting to 0 if absent
                });
                break;

            // ─── Actuator ESP32 ───────────────────────────────────────
            case 'rover/actuator/status':
                this.roverGateway.broadcastToDashboards('actuator-status', data);
                break;

            // ─── Sensor ESP32 (all-in-one payload) ───────────────────
            // Format: { node, radar:{front,right,back,left}, temp, hum, lux,
            //           imu:{roll,pitch,yaw}, power:{solarV,loadV,solarI,loadI} }
            case 'rover/node1/data':  // ← actual ESP32 topic
            case 'rover/node2/data':
            case 'rover/node3/data':
            case 'rover/sensor':      // legacy alias
                // Radar
                if (data.radar) {
                    this.roverGateway.broadcastToDashboards('radar-data', {
                        front: parseFloat(data.radar.front ?? 999),
                        right: parseFloat(data.radar.right ?? 999),
                        back: parseFloat(data.radar.back ?? 999),
                        left: parseFloat(data.radar.left ?? 999),
                    });
                }
                // IMU
                if (data.imu) {
                    this.roverGateway.broadcastToDashboards('imu-data', {
                        roll: parseFloat(data.imu.roll ?? 0),
                        pitch: parseFloat(data.imu.pitch ?? 0),
                        yaw: parseFloat(data.imu.yaw ?? 0),
                    });
                }
                // Environment
                if (data.temp !== undefined) {
                    this.roverGateway.broadcastToDashboards('env-data', {
                        temperature: parseFloat(data.temp ?? 0),
                        humidity: parseFloat(data.hum ?? 0),
                        lux: parseFloat(data.lux ?? 0),
                    });
                }
                // Power (solarV/loadV in V, solarI/loadI in mA)
                if (data.power) {
                    const solarV = parseFloat(data.power.solarV ?? 0);
                    const loadV = parseFloat(data.power.loadV ?? 0);
                    const solarI = parseFloat(data.power.solarI ?? 0);
                    const loadI = parseFloat(data.power.loadI ?? 0);
                    this.roverGateway.broadcastToDashboards('power-data', {
                        solarV,
                        loadV,
                        solarI,
                        loadI,
                        solarW: parseFloat((solarV * solarI / 1000).toFixed(2)),
                        loadW: parseFloat((loadV * loadI / 1000).toFixed(2)),
                    });
                }
                break;

            default:
                console.log(`[MQTT] Unhandled topic: ${topic}`);
        }
    }

    private parsePlainString(raw: string): Record<string, any> {
        const result: Record<string, any> = { _raw: raw };
        const parts = raw.split(',');
        for (const part of parts) {
            const [key, value] = part.trim().split(':');
            if (key && value !== undefined) {
                const num = parseFloat(value.trim());
                result[key.trim().toLowerCase()] = isNaN(num) ? value.trim() : num;
            }
        }
        return result;
    }

    /** Publish a payload to any MQTT topic */
    publish(topic: string, payload: object) {
        if (!this.client?.connected) {
            console.warn(`[MQTT] Cannot publish to ${topic} — not connected`);
            return;
        }
        this.client.publish(topic, JSON.stringify(payload));
    }

    onModuleDestroy() {
        if (this.client) {
            this.client.end();
            console.log('✅ Main MQTT client disconnected');
        }
        if (this.gpsClient) {
            this.gpsClient.end();
            console.log('✅ GPS MQTT client disconnected');
        }
    }
}
