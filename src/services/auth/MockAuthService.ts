import type { AuthService, AuthUser } from "./AuthService";

/** Placeholder until Google OAuth (client IDs + expo-auth-session) is wired up. */
export class MockAuthService implements AuthService {
  async signInWithGoogle(): Promise<AuthUser> {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return { name: "Hamidullo", email: "hamidullo0760@gmail.com" };
  }

  async signOut(): Promise<void> {}
}
