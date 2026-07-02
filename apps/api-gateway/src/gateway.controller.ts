import { Controller, All, Req, Res, UseGuards } from '@nestjs/common';
import { JwtGuard } from './guards/jwt.guard';
import type { Request, Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import axios, { AxiosError } from 'axios';
import { Public } from './decorators/public.decorator';

@Controller()
@UseGuards(ThrottlerGuard) // Use the ThrottlerGuard to limit the number of requests per minute
export class GatewayController {
  // Register and login are public routes so we don't need to check the JwtGuard
  @All('api/auth/register')
  @Public()
  proxyRegister(@Req() req: Request, @Res() res: Response) {
    return this.proxy(req, res, process.env.AUTH_SERVICE_URL!);
  }

  @All('api/auth/login')
  @Public()
  proxyLogin(@Req() req: Request, @Res() res: Response) {
    return this.proxy(req, res, process.env.AUTH_SERVICE_URL!);
  }

  // Proxy all other auth routes to the auth service they required a valid token
  @All('api/auth/*')
  @UseGuards(JwtGuard)
  proxyAuth(@Req() req: Request, @Res() res: Response) {
    return this.proxy(req, res, process.env.AUTH_SERVICE_URL!);
  }

  // Proxy all profile routes to the profile service they required a valid token
  @All('api/profile/*')
  @UseGuards(JwtGuard)
  proxyProfile(@Req() req: Request, @Res() res: Response) {
    return this.proxy(req, res, process.env.PROFILE_SERVICE_URL!);
  }

  // Proxy all other routes to the respective service
  private async proxy(req: Request, res: Response, serviceUrl: string) {
    try {
      const url = `${serviceUrl}${req.originalUrl}`;

      const response = await axios({
        method: req.method,
        url,
        data: req.body as unknown, // Use unknown to avoid type errors
        headers: {
          ...req.headers,
          host: undefined,
        },
      });

      res.status(response.status).json(response.data);
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        res.status(error.response.status).json(error.response.data);
      } else {
        res.status(500).json({ message: 'Internal server error' });
      }
    }
  }
}
