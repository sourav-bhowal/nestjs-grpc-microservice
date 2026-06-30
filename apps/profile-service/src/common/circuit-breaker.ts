type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED'; // Initial state is CLOSED
  private failureCount: number = 0; // Count of consecutive failures
  private lastFailureTime: number = 0; // Timestamp of the last failure

  constructor(
    private readonly failureThreshold: number = 5, // Number of failures before opening the circuit
    private readonly recoveryTimeout: number = 3000, // in milliseconds 3 seconds
  ) {}

  // Executes the provided action and manages the circuit breaker state based on the outcome.
  async excute<T>(action: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime; // Calculate the time since the last failure

      //
      if (timeSinceLastFailure < this.recoveryTimeout) {
        throw new Error('Circuit breaker is open. Please try again later.');
      }

      this.state = 'HALF_OPEN';
    }

    try {
      const result = await action(); // Execute the action and wait for its result
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  // Handles the successful execution of an action, resetting the failure count and closing the circuit.
  private onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  // Handles the failure of an action, incrementing the failure count and potentially opening the circuit.
  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}
