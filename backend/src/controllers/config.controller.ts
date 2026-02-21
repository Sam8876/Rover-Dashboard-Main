import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('config')
export class ConfigController {
    constructor(private configService: ConfigService) { }

    @Get('webrtc-url')
    getWebRTCUrl() {
        const url1 = this.configService.get<string>('RASPBERRY_PI_WEBRTC_URL', 'ws://100.76.189.123:8088/ws');
        // Add an explicit fallback for cam2 (e.g. port 8089) if not set in .env
        const url2 = this.configService.get<string>('RASPBERRY_PI_WEBRTC_URL_2', 'ws://100.76.189.123:8088/ws');

        return {
            wsUrl: url1,
            cam1: url1,
            cam2: url2,
        };
    }
}
