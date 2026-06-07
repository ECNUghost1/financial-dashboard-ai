export interface User {
  id: string;
  email: string;
  username?: string;
  created_at: string;
}

export interface AuthResult {
  success: boolean;
  error?: string;
}

export interface AuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}