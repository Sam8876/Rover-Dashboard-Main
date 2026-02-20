import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoverGateway } from './gateways/rover.gateway';
import { ConfigController } from './controllers/config.controller';
import { MqttService } from './services/mqtt.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, ConfigController],
  providers: [AppService, RoverGateway, MqttService],
})
export class AppModule { }
