import { NestFactory } from '@nestjs/core';
import { ProfileModule } from './profile.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(ProfileModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove any properties that are not in the DTO
      transform: true, // Transform the incoming data to the DTO
    }),
  );

  app.setGlobalPrefix('api'); // Set the global prefix for the app

  await app.listen(process.env.PORT ?? 3002);
}
void bootstrap();
