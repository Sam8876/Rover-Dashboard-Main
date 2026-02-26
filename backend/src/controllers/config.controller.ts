import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('config')
export class ConfigController {
    constructor(private configService: ConfigService) { }

    @Get('webrtc-url')
    getWebRTCUrl() {
        const url1 = this.configService.get<string>('RASPBERRY_PI_WEBRTC_URL', 'http://100.115.91.111:8889/rovercam');
        // Both cam1 and cam2 share the same Mediaplayer UDP 8088 track Relay
        const url2 = this.configService.get<string>('RASPBERRY_PI_WEBRTC_URL_2', 'http://100.115.91.111:8889/rovercam');

        return {
            wsUrl: url1,
            cam1: url1,
            cam2: url2,
        };
    }
}
