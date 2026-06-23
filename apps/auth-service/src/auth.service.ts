import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { db } from 'src/database';
import { User, users } from 'src/database/schema';
import { RegisterDto } from 'src/dto/register.dto';
import { LoginDto } from 'src/dto/login.dto';
import { AuthenticatedUser } from 'src/decorators/current-user.decorator';

// This service handles user registration and authentication logic.
@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  // Registers a new user. It checks if the email is already in use, hashes the password, and stores the user in the database.
  async register(dto: RegisterDto) {
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, dto.email));

    if (existingUser) throw new ConflictException('Email already used.');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const [newUser] = await db
      .insert(users)
      .values({
        email: dto.email,
        password: hashedPassword,
      })
      .returning();

    return {
      user: this.sanitizeUser(newUser),
      token: this.generateToken(newUser),
    };
  }

  // Logs in an existing user. It verifies the email and password, and if valid, returns a JWT token for authentication.
  async login(dto: LoginDto) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, dto.email));

    if (!user) throw new UnauthorizedException('Invalid credentials.');

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials.');

    return {
      user: this.sanitizeUser(user),
      token: this.generateToken(user),
    };
  }

  // Validates a JWT token and returns the decoded user information if the token is valid, or an error message if it's invalid or expired.
  async validateToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(
        token,
        {
          secret: process.env.JWT_SECRET!,
        },
      );

      return {
        // It matches the Proto definition for the ValidateTokenResponse message.
        valid: true,
        user_id: payload.sub,
        email: payload.email,
        error: '',
      };
    } catch {
      return {
        // It matches the Proto definition for the ValidateTokenResponse message.
        valid: false,
        user_id: '',
        email: '',
        error: 'Invalid or expired token',
      };
    }
  }

  // Sanitizes the user object by removing sensitive information like the password before returning it.
  private sanitizeUser(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  // Generates a JWT token for the authenticated user, including their ID and email in the token payload.
  private generateToken(user: User) {
    return this.jwtService.sign({ sub: user.id, email: user.email });
  }
}
