import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { GrpcAuthGuard } from './guards/grpc-auth.guard';
import { AuthClient } from './clients/auth.client';

@Module({
  imports: [],
  controllers: [ProfileController],
  providers: [ProfileService, GrpcAuthGuard, AuthClient],
})
export class ProfileModule {}
