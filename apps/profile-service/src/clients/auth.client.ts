import {
  Injectable,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { Client, type ClientGrpc, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Observable, firstValueFrom } from 'rxjs';
import { CircuitBreaker } from '../common/circuit-breaker';

// The `AuthGrpcService` interface defines the structure of the gRPC service for authentication.
// It includes a method `validateToken` that takes an object with a `token` property and returns an observable
// that emits an object containing the validation result, user ID, email, and any error message.
// This interface is used to define the expected behavior of the gRPC service when communicating with the AuthService.
interface AuthGrpcService {
  validateToken(data: { token: string }): Observable<{
    valid: boolean;
    user_id: string;
    email: string;
    error: string;
  }>;
}

// The `AuthClient` class is a NestJS service that acts as a gRPC client to communicate with the AuthService.
// It implements the `OnModuleInit` interface to initialize the gRPC service when the module is initialized.
// The class uses a circuit breaker pattern to manage failures and prevent cascading failures in case of repeated errors when validating tokens.
@Injectable()
export class AuthClient implements OnModuleInit {
  @Client({
    transport: Transport.GRPC,
    options: {
      package: 'auth',
      protoPath: join(process.cwd(), '../../libs/shared/src/proto/auth.proto'),
      url: process.env.AUTH_SERVICE_GRPC_URL || 'localhost:50051',
      loader: { keepCase: true }, // Keep the case of the fields in the proto file
    },
  })

  // The `AuthClient` class is a NestJS service that acts as a gRPC client to communicate with the AuthService.
  // It implements the `OnModuleInit` interface to initialize the gRPC service when the module is initialized.
  // The class uses a circuit breaker pattern to manage failures and prevent cascading failures in case of repeated errors when validating tokens.
  private client: ClientGrpc;

  // The `authService` property is an instance of the `AuthGrpcService` interface, which defines the gRPC methods available for communication with the AuthService.
  // It is initialized in the `onModuleInit` method, where the gRPC service is retrieved from the client.
  private authService: AuthGrpcService;

  // The `circuitBreaker` property is an instance of the `CircuitBreaker` class, which manages the state of the circuit breaker.
  // It is initialized with a failure threshold of 5 and a recovery timeout of 3000 milliseconds (3 seconds).
  // The circuit breaker is used to wrap the gRPC calls to the AuthService, allowing the system to handle failures gracefully and
  // prevent cascading failures in case of repeated errors.
  private circuitBreaker = new CircuitBreaker();

  // The `onModuleInit` method is called when the module is initialized.
  // It retrieves the gRPC service for the AuthService from the client and assigns it to the `authService` property.
  // This allows the `AuthClient` to make gRPC calls to the AuthService's methods, such as `validateToken`, using the defined interface.
  onModuleInit() {
    this.authService = this.client.getService<AuthGrpcService>('AuthService');
  }

  // Validates the provided token by calling the AuthService's validateToken method through gRPC.
  // Uses a circuit breaker to manage failures and prevent cascading failures in case of repeated errors.
  async validateToken(token: string) {
    const result = await this.circuitBreaker.excute(() =>
      firstValueFrom(this.authService.validateToken({ token })),
    );

    if (!result.valid) {
      throw new UnauthorizedException(result.error || 'Invalid token');
    }

    return result;
  }
}
