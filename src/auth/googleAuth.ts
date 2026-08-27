import type { GisTokenClient, GisTokenResponse } from '@/types/google'

/**
 * Google Identity Services token flow.
 *
 * A GitHub Pages build is a public client with no backend, so the OAuth
 * authorization-code + PKCE flow is unavailable: Google's token endpoint
 * requires a client secret for "Web application" clients. GIS `initTokenClient`
 * is the supported browser-only equivalent — it returns a short-lived access
 * token straight to the page and never exposes a refresh token or a secret.
 *
 * The token is kept in memory only. Nothing auth-related is written to storage.
 */

export const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'

const GIS_SRC = 'https://accounts.google.com/gsi/client'

export interface AccessToken {
  value: string
  /** Epoch milliseconds at which the token stops being usable. */
  expiresAt: number
}

export class GoogleAuthError extends Error {
  readonly cause?: string

  constructor(message: string, cause?: string) {
    super(message)
    this.name = 'GoogleAuthError'
    this.cause = cause
  }
}

/** The literal value shipped in .env.example, which Google rejects with a bare error page. */
const PLACEHOLDER_CLIENT_ID = 'your-client-id.apps.googleusercontent.com'

const CLIENT_ID_PATTERN = /^[\w-]+\.apps\.googleusercontent\.com$/

export const CLIENT_ID_HELP =
  'Set VITE_GOOGLE_CLIENT_ID to a real Google OAuth "Web application" client ID ' +
  '(copy .env.example to .env, then restart the dev server).'

/** Distinguishes "not configured" from "configured with something Google will reject". */
export function clientIdProblem(clientId: string | undefined): string | null {
  const value = clientId?.trim()
  if (!value) return `VITE_GOOGLE_CLIENT_ID is not set. ${CLIENT_ID_HELP}`
  if (value === PLACEHOLDER_CLIENT_ID) {
    return `VITE_GOOGLE_CLIENT_ID is still the .env.example placeholder. ${CLIENT_ID_HELP}`
  }
  if (!CLIENT_ID_PATTERN.test(value)) {
    return `VITE_GOOGLE_CLIENT_ID does not look like a Google client ID. ${CLIENT_ID_HELP}`
  }
  return null
}

/** The same check applied to this build's environment. */
export function configurationProblem(): string | null {
  return clientIdProblem(import.meta.env.VITE_GOOGLE_CLIENT_ID)
}

export function getClientId(): string {
  const problem = configurationProblem()
  if (problem) throw new GoogleAuthError(problem)
  return import.meta.env.VITE_GOOGLE_CLIENT_ID!.trim()
}

export function isConfigured(): boolean {
  return configurationProblem() === null
}

let scriptPromise: Promise<void> | null = null

/** Injects the GIS script once and resolves when `window.google` is ready. */
export function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`)
    const script = existing ?? document.createElement('script')

    script.addEventListener('load', () => resolve())
    script.addEventListener('error', () => {
      scriptPromise = null
      reject(new GoogleAuthError('Failed to load Google Identity Services.'))
    })

    if (!existing) {
      script.src = GIS_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }
  })

  return scriptPromise
}

let tokenClient: GisTokenClient | null = null
let pending: ((response: GisTokenResponse) => void) | null = null

function getTokenClient(): GisTokenClient {
  if (tokenClient) return tokenClient

  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) throw new GoogleAuthError('Google Identity Services is not available.')

  tokenClient = oauth2.initTokenClient({
    client_id: getClientId(),
    scope: GOOGLE_SCOPES,
    callback: (response) => pending?.(response),
    error_callback: (error) =>
      pending?.({ error: error.type ?? 'popup_error', error_description: error.message }),
  })

  return tokenClient
}

/**
 * Opens the Google sign-in popup and resolves with a fresh in-memory access token.
 *
 * GIS always uses a popup here — `prompt: 'none'` only skips the consent and
 * account-picker screens, it does not make the flow invisible. So this must
 * only ever be called from a user gesture, or the browser will block it.
 */
export function requestAccessToken(
  prompt: '' | 'none' | 'consent' | 'select_account' = '',
): Promise<AccessToken> {
  const client = getTokenClient()

  return new Promise<AccessToken>((resolve, reject) => {
    pending = (response) => {
      pending = null

      if (response.error || !response.access_token) {
        reject(
          new GoogleAuthError(
            response.error_description ?? 'Google sign-in was cancelled or failed.',
            response.error,
          ),
        )
        return
      }

      const expiresInSeconds = Number(response.expires_in ?? 3600)
      resolve({
        value: response.access_token,
        expiresAt: Date.now() + expiresInSeconds * 1000,
      })
    }

    try {
      client.requestAccessToken({ prompt })
    } catch (error) {
      pending = null
      reject(error instanceof Error ? error : new GoogleAuthError('Sign-in failed.'))
    }
  })
}

/** Tells Google to drop the grant, so a later sign-in starts clean. */
export function revokeAccessToken(token: string): Promise<void> {
  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) return Promise.resolve()
  return new Promise((resolve) => oauth2.revoke(token, () => resolve()))
}

export function isExpired(token: AccessToken, skewMs = 60_000): boolean {
  return token.expiresAt - skewMs <= Date.now()
}

/** Test seam: drops the cached script promise and token client. */
export function resetGoogleAuthForTests(): void {
  scriptPromise = null
  tokenClient = null
  pending = null
}
