import { isApiConfigured } from '@/services/api/config';

import type { AuthService } from './AuthService';
import { ApiAuthService } from './ApiAuthService';
import { GoogleIdTokenProvider } from './GoogleIdTokenProvider';
import { MockAuthService } from './MockAuthService';

export type { AuthService, AuthUser } from './AuthService';
export { SignInCancelled } from './GoogleIdTokenProvider';

export const authService: AuthService = isApiConfigured ? new ApiAuthService(new GoogleIdTokenProvider()) : new MockAuthService();
