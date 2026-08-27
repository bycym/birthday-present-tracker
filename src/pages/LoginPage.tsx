import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'

export function LoginPage() {
  const { status, isSignedIn, error, configured, signIn } = useAuth()
  const location = useLocation()
  const [busy, setBusy] = useState(false)

  if (isSignedIn) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? '/'} replace />
  }

  const handleSignIn = async () => {
    setBusy(true)
    try {
      await signIn()
    } catch {
      // The failure reason is already surfaced through the auth context.
    } finally {
      setBusy(false)
    }
  }

  const disabled = !configured || busy || status === 'initializing'

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Birthday Gift Tracker</CardTitle>
          <CardDescription>
            Sign in with Google to read birthdays from your calendars. All gift data stays on
            your device.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" onClick={handleSignIn} disabled={disabled}>
            {status === 'initializing'
              ? 'Checking Google session…'
              : busy
                ? 'Opening Google…'
                : 'Sign in with Google'}
          </Button>

          {error && (
            <p role="alert" className="mt-4 text-sm text-muted-foreground">
              {error}
            </p>
          )}

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Read-only calendar access. Your Google token is kept in this browser tab only and is
            cleared when the tab closes.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
