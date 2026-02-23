interface TokenClient {
  requestAccessToken(options?: { prompt?: string }): void;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  error?: string;
}

interface ErrorResponse {
  type: string;
  message?: string;
}

interface Google {
  accounts: {
    oauth2: {
      initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: ErrorResponse) => void;
      }): TokenClient;
      revoke(token: string, callback: () => void): void;
    };
  };
}

declare const google: Google;
