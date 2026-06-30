import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);

  app.enableCors(); // Enable CORS for all origins

  // Connect the auth service to the microservice using GRPC
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'auth', // Name of the auth GRPC package which we defined in proto file
      protoPath: join(process.cwd(), '../../libs/shared/src/proto/auth.proto'), // Path to the proto file
      url: `0.0.0.0:${process.env.GRPC_PORT ?? 50051}`, // URL of the auth service
      loader: { keepCase: true }, // Keep the case of the fields in the proto file
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

  await app.startAllMicroservices(); // Start the microservices only needed here because we are using the auth service as a microservice

  // Start the auth service as a standalone server
  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap(); // Bootstrap the application
