export interface AuthUser {
  name: string;
  email: string;
}

export interface AuthService {
  signInWithGoogle(): Promise<AuthUser>;
  /** The person from a previous launch, or null when nobody is signed in. */
  restore(): Promise<AuthUser | null>;
  signOut(): Promise<void>;
}
