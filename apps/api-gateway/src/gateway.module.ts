import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import Redis from 'ioredis';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';
import { JwtGuard } from './guards/jwt.guard';
import { Reflector } from '@nestjs/core';
import { GatewayController } from './gateway.controller';

@Module({
  imports: [
    JwtModule.register({
      // Register the JwtModule to use the JwtService
      secret: process.env.JWT_SECRET!,
      signOptions: { expiresIn: '7d' },
    }),
    ThrottlerModule.forRoot({
      // Register the ThrottlerModule to use the ThrottlerInterceptor it is used to limit the number of requests per minute
      throttlers: [
        {
          ttl: 60000, // 1 minute
          limit: 5, // 5 requests per minute
        },
      ],
      storage: new ThrottlerStorageRedisService(
        new Redis(process.env.REDIS_URL!),
      ),
    }),
  ],
  controllers: [GatewayController],
  providers: [JwtGuard, Reflector],
})
export class GatewayModule {}
