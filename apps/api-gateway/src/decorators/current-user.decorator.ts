import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface AuthenticatedUser {
  sub: string; // User ID
  email: string; // User email
  iat: number; // Issued at timestamp
  exp: number; // Expiration timestamp
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser; // Optional user property to hold authenticated user information
}

// This decorator can be used in any controller method to access the authenticated user's information.
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AuthenticatedUser | null => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();

    return request.user;
  },
);
