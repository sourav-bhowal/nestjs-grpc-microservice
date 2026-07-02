import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import {
  AuthenticatedUser,
  RequestWithUser,
} from '../decorators/current-user.decorator';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true; // Allow access to public routes without authentication

    // Get the request object
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers['authorization'];

    // Check if the authorization header is present
    if (!authHeader)
      throw new UnauthorizedException('Authorization header is missing');

    // Check if the authorization header is in the correct format
    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token)
      throw new UnauthorizedException('Invalid authorization header format');

    // Verify the token
    try {
      // Verify the token using the JwtService
      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(
        token,
        {
          secret: process.env.JWT_SECRET!,
        },
      );
      request.user = payload; // Attach the decoded user information to the request object
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
