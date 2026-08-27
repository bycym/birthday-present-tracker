import { createContext, useContext } from 'react'

export type AuthStatus = 'initializing' | 'signed-out' | 'signing-in' | 'signed-in'

export interface AuthContextValue {
  status: AuthStatus
  isSignedIn: boolean
  /** Present only while signed in; never persisted. */
  error: string | null
  configured: boolean
  signIn(): Promise<void>
  signOut(): Promise<void>
  /** Returns a valid token, silently refreshing an expired one. */
  getAccessToken(): Promise<string>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an <AuthProvider>')
  return context
}
