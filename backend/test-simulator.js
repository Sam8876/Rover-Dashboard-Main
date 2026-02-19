// Test Simulator for NEXUS PRIME Dashboard
// Sends simulated rover data to test dashboard without hardware

const io = require('socket.io-client');

const socket = io('http://localhost:3000');

let lat = 28.6139;  // Starting position (Delhi, India)
let lon = 77.2090;
let heading = 0;
let speed = 0;

socket.on('connect', () => {
    console.log('✅ Test simulator connected to backend');
    socket.emit('register-rover');

    // Simulate GPS data (rover moving in a circle)
    setInterval(() => {
        // Update heading (rotate clockwise)
        heading = (heading + 2) % 360;

        // Update speed (oscillate between 0-10 km/h)
        speed = 5 + 5 * Math.sin(Date.now() / 2000);

        // Move rover slightly
        const rad = heading * Math.PI / 180;
        lat += Math.cos(rad) * 0.00001;
        lon += Math.sin(rad) * 0.00001;

        socket.emit('gps-data', {
            lat: lat,
            lon: lon,
            speed: Math.abs(speed),
            heading: heading
        });
    }, 500); // 2Hz update

    // Simulate radar data (random obstacles)
    setInterval(() => {
        socket.emit('radar-data', {
            front: Math.random() * 150 + 10,
            right: Math.random() * 150 + 10,
            back: Math.random() * 150 + 10,
            left: Math.random() * 150 + 10
        });
    }, 200); // 5Hz update

    // Simulate YOLO detections
    setInterval(() => {
        if (Math.random() > 0.7) {
            socket.emit('yolo-detections', [
                {
                    x: Math.random() * 300,
                    y: Math.random() * 200,
                    w: 50 + Math.random() * 100,
                    h: 50 + Math.random() * 100,
                    label: ['person', 'car', 'dog', 'bicycle'][Math.floor(Math.random() * 4)],
                    conf: (0.7 + Math.random() * 0.3).toFixed(2)
                }
            ]);
        }
    }, 2000);

    console.log('📡 Sending simulated data to dashboard...');
    console.log('   - GPS: 2Hz');
    console.log('   - Radar: 5Hz');
    console.log('   - YOLO: Random detections');
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected from backend');
});

// Handle waypoint commands from dashboard
socket.on('add-waypoint', (waypoint) => {
    console.log('📍 Waypoint added:', waypoint);
});

socket.on('remove-waypoint', (data) => {
    console.log('🗑️  Waypoint removed at index:', data.index);
});

socket.on('clear-waypoints', () => {
    console.log('🗑️  All waypoints cleared');
});

console.log('🚀 NEXUS PRIME Test Simulator');
console.log('Connecting to NestJS backend at http://localhost:3000...');
