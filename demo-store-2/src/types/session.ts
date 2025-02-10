export interface SessionResponse {
  authorization_code: string;
}

export interface SessionError {
  message: string;
}

export interface SSOParams {
  state: string;
  redirect_url: string;
}

export interface APIError {
  message: string;
  status?: number;
}
