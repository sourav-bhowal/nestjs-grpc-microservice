import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Connect the auth service to the microservice using GRPC
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'auth', // Name of the auth GRPC package which we defined in proto file
      protoPath: join(__dirname, '../../../libs/shared/src/proto/auth.proto'), // Path to the proto file
      url: `0.0.0.0:${process.env.GRPC_PORT ?? 50051}`, // URL of the auth service
    },
  });

  // Use the validation pipe for all incoming requests
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove any properties that are not in the DTO
      transform: true, // Transform the incoming data to the DTO
    }),
  );

  app.setGlobalPrefix('api'); // Set the global prefix for the app

  // Start the auth service
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
