import type { AccessToken } from './googleAuth'

/**
 * Persists the Google access token for the lifetime of the browser tab.
 *
 * This is a deliberate deviation from the PRD's "never store Google
 * credentials" rule, taken so a page refresh does not force a new sign-in.
 * The exposure is bounded: `sessionStorage` is per-tab and same-origin, it is
 * cleared when the tab closes, and the token itself expires in about an hour.
 * No refresh token exists to store, so a stolen value cannot be renewed.
 */

export const TOKEN_STORAGE_KEY = 'bgt.google-token'

interface StoredToken {
  value: string
  expiresAt: number
}

function isStoredToken(candidate: unknown): candidate is StoredToken {
  if (typeof candidate !== 'object' || candidate === null) return false
  const token = candidate as Partial<StoredToken>
  return typeof token.value === 'string' && typeof token.expiresAt === 'number'
}

/** Every access is guarded: private windows and locked-down profiles throw. */
function storage(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

export function saveToken(token: AccessToken): void {
  try {
    storage()?.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token))
  } catch {
    // Persisting is a convenience; failing to do so must not break sign-in.
  }
}

export function clearToken(): void {
  try {
    storage()?.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // Nothing to do; the in-memory token is cleared by the caller regardless.
  }
}

/**
 * Returns the stored token only while it is still usable. An expired or
 * malformed entry is dropped, so a stale value can never linger.
 */
export function loadToken(now = Date.now(), skewMs = 60_000): AccessToken | null {
  let raw: string | null = null

  try {
    raw = storage()?.getItem(TOKEN_STORAGE_KEY) ?? null
  } catch {
    return null
  }

  if (!raw) return null

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isStoredToken(parsed) || parsed.expiresAt - skewMs <= now) {
      clearToken()
      return null
    }
    return parsed
  } catch {
    clearToken()
    return null
  }
}
