interface TokenClient {
  requestAccessToken(options?: { prompt?: string; login_hint?: string }): void;
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

interface CredentialResponse {
  credential: string;
  select_by: string;
}

interface IdConfiguration {
  client_id: string;
  callback: (response: CredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  login_hint?: string;
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
    id: {
      initialize(config: IdConfiguration): void;
      prompt(momentListener?: (notification: { isNotDisplayed(): boolean; isSkippedMoment(): boolean }) => void): void;
      cancel(): void;
    };
  };
}

declare const google: Google;
