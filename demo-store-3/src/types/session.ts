export interface SessionTokenRequest {
  authorization_code: string;
  code_verifier: string;
}

export interface SessionTokenResponse {
  id_token: string;
  access_token: string;
}
