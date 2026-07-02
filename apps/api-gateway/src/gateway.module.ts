import { Module } from '@nestjs/common';
import { AppController } from './gateway.controller';
import { AppService } from './gateway.service';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
