import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  GrpcAuthGuard,
  type GrpcAuthenticatedUser,
} from './guards/grpc-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('profile')
@UseGuards(GrpcAuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: GrpcAuthenticatedUser) {
    return this.profileService.getProfileByUserId(user.user_id);
  }

  @Patch()
  updateProfile(
    @CurrentUser() user: GrpcAuthenticatedUser,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profileService.updateProfile(user.user_id, updateProfileDto);
  }
}
