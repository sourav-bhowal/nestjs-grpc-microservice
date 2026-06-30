import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthClient } from 'src/clients/auth.client';

export interface GrpcAuthenticatedUser {
  valid: boolean;
  user_id: string;
  email: string;
  error: string;
}

export interface RequestWithGrpcUser extends Request {
  user: GrpcAuthenticatedUser; // Extend the Request interface to include the user property
}

// This Guard
@Injectable()
export class GrpcAuthGuard implements CanActivate {
  constructor(private authClient: AuthClient) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithGrpcUser>();

    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is missing');
    }

    const [bearer, token] = authHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    try {
      const response = await this.authClient.validateToken(token);
      if (!response.valid) {
        throw new UnauthorizedException(
          'Invalid or expired token' +
            (response.error ? `: ${response.error}` : ''),
        );
      }

      request.user = response;
      return true;
    } catch {
      throw new UnauthorizedException('Error occurred while verifying token');
    }
  }
}
