export interface SessionTokenRequest {
  code: string;
  code_verifier: string;
}

export interface SessionTokenResponse {
  id_token: string;
  access_token: string;
}
