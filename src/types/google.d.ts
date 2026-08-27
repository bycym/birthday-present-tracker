// Minimal typings for the Google Identity Services script loaded from accounts.google.com.
export interface GisTokenResponse {
  access_token?: string
  expires_in?: string | number
  scope?: string
  error?: string
  error_description?: string
}

export interface GisTokenClient {
  requestAccessToken(overrides?: { prompt?: '' | 'none' | 'consent' | 'select_account' }): void
}

export interface GisTokenClientConfig {
  client_id: string
  scope: string
  prompt?: '' | 'none' | 'consent' | 'select_account'
  callback: (response: GisTokenResponse) => void
  error_callback?: (error: { type?: string; message?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: GisTokenClientConfig): GisTokenClient
          revoke(token: string, done?: () => void): void
        }
      }
    }
  }
}
