import type { AuthService } from './AuthService';
import { MockAuthService } from './MockAuthService';

export type { AuthService, AuthUser } from './AuthService';

export const authService: AuthService = new MockAuthService();
