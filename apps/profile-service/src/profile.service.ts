import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from './database';
import { eq } from 'drizzle-orm';
import { profiles } from './database/schema';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  async getProfileByUserId(userId: string) {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));

    if (!profile) {
      const [newProfile] = await db
        .insert(profiles)
        .values({ userId })
        .returning();
      return newProfile;
    }
    return profile;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId));

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    const [updatedProfile] = await db
      .update(profiles)
      .set(updateProfileDto)
      .where(eq(profiles.userId, userId))
      .returning();

    if (!updatedProfile) {
      throw new BadRequestException('Failed to update profile');
    }
    return updatedProfile;
  }
}
