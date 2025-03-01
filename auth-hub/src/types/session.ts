export interface SessionRequest {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
}

export interface Tokens {
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
}

export interface SessionResponse {
  authorization_code: string;
}

export interface SessionError {
  message: string;
}

export interface SSOParams {
  state: string;
  redirect_uri: string;
}

export interface APIError {
  message: string;
  status?: number;
}
