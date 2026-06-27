import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { AuthService } from 'src/auth.service';
import { RegisterDto } from 'src/dto/register.dto';
import { LoginDto } from 'src/dto/login.dto';
import {
  type AuthenticatedUser,
  CurrentUser,
} from 'src/decorators/current-user.decorator';
import { Public } from 'src/decorators/public.decorator';
import { JwtGuard } from 'src/guards/jwt.guard';

@Controller('auth') // Base URL for the auth controller
@UseGuards(JwtGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Public()
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  // This method is used to validate a token using gRPC.
  @GrpcMethod('AuthService', 'ValidateToken')
  validateToken(data: { token: string }) {
    return this.authService.validateToken(data.token);
  }
}
