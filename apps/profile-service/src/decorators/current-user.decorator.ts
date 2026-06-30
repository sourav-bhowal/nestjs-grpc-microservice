import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  RequestWithGrpcUser,
  GrpcAuthenticatedUser,
} from 'src/guards/grpc-auth.guard';

// This decorator return the grpc user who is logged in
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): GrpcAuthenticatedUser | null => {
    const request = ctx.switchToHttp().getRequest<RequestWithGrpcUser>();

    return request.user;
  },
);
