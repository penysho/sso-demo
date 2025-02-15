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
