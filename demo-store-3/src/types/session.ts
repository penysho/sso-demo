export interface SessionTokenRequest {
  code: string;
  code_verifier: string;
  grant_type: string;
  client_id: string;
  redirect_uri: string;
}

export interface SessionTokenResponse {
  id_token: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}
