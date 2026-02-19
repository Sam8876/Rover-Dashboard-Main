import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RoverGateway } from './gateways/rover.gateway';
import { ConfigController } from './controllers/config.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [AppController, ConfigController],
  providers: [AppService, RoverGateway],
})
export class AppModule { }
