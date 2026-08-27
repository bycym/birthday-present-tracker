import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  configurationProblem,
  isConfigured,
  isExpired,
  loadGoogleIdentityServices,
  requestAccessToken,
  revokeAccessToken,
  GoogleAuthError,
  type AccessToken,
} from '@/auth/googleAuth'
import { clearToken, loadToken, saveToken } from '@/auth/tokenStorage'
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context'

/**
 * Holds the Google access token in a ref for the lifetime of the page only.
 * Reloading signs the user out by design — no token ever reaches IndexedDB,
 * localStorage or sessionStorage.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const tokenRef = useRef<AccessToken | null>(null)
  const [status, setStatus] = useState<AuthStatus>('initializing')
  const [error, setError] = useState<string | null>(null)
  const configured = isConfigured()

  useEffect(() => {
    let cancelled = false

    if (!configured) {
      setStatus('signed-out')
      setError(configurationProblem())
      return
    }

    // A token kept from earlier in this tab means the refresh can skip sign-in.
    const stored = loadToken()
    if (stored) tokenRef.current = stored

    loadGoogleIdentityServices()
      .then(() => {
        if (!cancelled) setStatus(stored ? 'signed-in' : 'signed-out')
      })
      .catch((cause: unknown) => {
        if (cancelled) return
        setStatus('signed-out')
        setError(cause instanceof Error ? cause.message : 'Google sign-in is unavailable.')
      })

    return () => {
      cancelled = true
    }
  }, [configured])

  const signIn = useCallback(async () => {
    setError(null)
    setStatus('signing-in')
    try {
      await loadGoogleIdentityServices()
      const token = await requestAccessToken('')
      tokenRef.current = token
      saveToken(token)
      setStatus('signed-in')
    } catch (cause) {
      tokenRef.current = null
      clearToken()
      setStatus('signed-out')
      setError(cause instanceof Error ? cause.message : 'Sign-in failed.')
      throw cause
    }
  }, [])

  const signOut = useCallback(async () => {
    const token = tokenRef.current
    tokenRef.current = null
    clearToken()
    setStatus('signed-out')
    setError(null)
    // Revoking the grant is what makes sign-out stick: without it the silent
    // restore on the next load would simply sign the user back in.
    if (token) await revokeAccessToken(token.value)
  }, [])

  const getAccessToken = useCallback(async () => {
    const current = tokenRef.current
    if (current && !isExpired(current)) return current.value

    // Renewal needs a popup, which the browser only allows from a user gesture,
    // so an aged-out token drops back to the sign-in screen rather than failing
    // deep inside a data fetch.
    tokenRef.current = null
    clearToken()
    setStatus('signed-out')
    throw new GoogleAuthError('Your Google session expired. Please sign in again.')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      isSignedIn: status === 'signed-in',
      error,
      configured,
      signIn,
      signOut,
      getAccessToken,
    }),
    [status, error, configured, signIn, signOut, getAccessToken],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
