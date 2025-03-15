export interface SessionRequest {
  client_id: string;
  redirect_uri: string;
  code_challenge: string;
  code_challenge_method: string;
  response_type: string;
  scope: string;
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
