import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('config')
export class ConfigController {
    constructor(private configService: ConfigService) { }

    @Get('webrtc-url')
    getWebRTCUrl() {
        return {
            url: this.configService.get<string>('RASPBERRY_PI_WEBRTC_URL', 'ws://10.139.97.33:8080'),
        };
    }
}
