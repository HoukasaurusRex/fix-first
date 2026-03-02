/** JWT payload decoded from an access token. */
export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}

/** Authenticated user profile returned by the API (no password). */
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  province: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Response body for register and login endpoints. */
export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}
