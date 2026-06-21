import { SetMetadata } from '@nestjs/common';

// The IS_PUBLIC_KEY constant is used as a key for the metadata that indicates whether a route or controller is public (does not require authentication).
export const IS_PUBLIC_KEY = 'isPublic';

// The Public decorator can be applied to route handlers or controllers to indicate that they do not require authentication.
// When this decorator is used, the authentication guard will skip the authentication check for that specific route or controller.
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
