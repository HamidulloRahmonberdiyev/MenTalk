export interface AuthUser {
  name: string;
  email: string;
}

export interface AuthService {
  signInWithGoogle(): Promise<AuthUser>;
  signOut(): Promise<void>;
}
