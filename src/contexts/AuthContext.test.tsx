import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '@/db'
import { TOKEN_STORAGE_KEY } from '@/auth/tokenStorage'
import { AuthProvider } from './AuthContext'
import { useAuth } from './auth-context'

const requestAccessToken = vi.fn()
const revokeAccessToken = vi.fn()

vi.mock('@/auth/googleAuth', async () => {
  const actual = await vi.importActual<typeof import('@/auth/googleAuth')>('@/auth/googleAuth')
  return {
    ...actual,
    isConfigured: () => true,
    loadGoogleIdentityServices: () => Promise.resolve(),
    requestAccessToken: (...args: unknown[]) => requestAccessToken(...args),
    revokeAccessToken: (...args: unknown[]) => revokeAccessToken(...args),
  }
})

function Probe() {
  const { status, signIn, signOut, getAccessToken } = useAuth()
  return (
    <div>
      <span data-testid="status">{status}</span>
      <button onClick={() => void signIn().catch(() => {})}>sign in</button>
      <button onClick={() => void signOut()}>sign out</button>
      <button onClick={() => void getAccessToken().catch(() => {})}>get token</button>
    </div>
  )
}

beforeEach(() => {
  requestAccessToken.mockReset()
  revokeAccessToken.mockReset().mockResolvedValue(undefined)
  localStorage.clear()
  sessionStorage.clear()
})

describe('AuthProvider', () => {
  it('moves through signed-out → signed-in → signed-out', async () => {
    requestAccessToken.mockResolvedValue({ value: 'token-1', expiresAt: Date.now() + 3_600_000 })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-out'))

    await userEvent.click(screen.getByRole('button', { name: 'sign in' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'))

    await userEvent.click(screen.getByRole('button', { name: 'sign out' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-out'))
    expect(revokeAccessToken).toHaveBeenCalledWith('token-1')
  })

  it('reports a cancelled sign-in without getting stuck', async () => {
    requestAccessToken.mockRejectedValue(new Error('popup closed'))
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'sign in' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-out'))
  })

  it('hands back the token while it is still live', async () => {
    requestAccessToken.mockResolvedValue({ value: 'token-1', expiresAt: Date.now() + 3_600_000 })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'sign in' }))
    await userEvent.click(screen.getByRole('button', { name: 'get token' }))

    // One popup for the sign-in, none for reading the token back.
    expect(requestAccessToken).toHaveBeenCalledTimes(1)
    expect(requestAccessToken).toHaveBeenCalledWith('')
    expect(screen.getByTestId('status')).toHaveTextContent('signed-in')
  })

  it('never writes the token to IndexedDB or localStorage', async () => {
    requestAccessToken.mockResolvedValue({ value: 'secret-token', expiresAt: Date.now() + 60_000 })
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'sign in' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'))

    expect(JSON.stringify(localStorage)).not.toContain('secret-token')

    await db.open()
    const stored = JSON.stringify([await db.gifts.toArray(), await db.settings.toArray()])
    expect(stored).not.toContain('secret-token')
  })
})

describe('session persistence across a refresh', () => {
  it('starts signed in when this tab still holds a live token', async () => {
    sessionStorage.setItem(
      TOKEN_STORAGE_KEY,
      JSON.stringify({ value: 'kept', expiresAt: Date.now() + 3_600_000 }),
    )

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'))
    // No popup: the stored token is reused as-is.
    expect(requestAccessToken).not.toHaveBeenCalled()
  })

  it('ignores a token that has already expired', async () => {
    sessionStorage.setItem(
      TOKEN_STORAGE_KEY,
      JSON.stringify({ value: 'stale', expiresAt: Date.now() - 1 }),
    )

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-out'))
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('persists the token after an interactive sign-in', async () => {
    requestAccessToken.mockResolvedValue({ value: 'fresh', expiresAt: Date.now() + 3_600_000 })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'sign in' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'))
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toContain('fresh')
  })

  it('clears the stored token on sign out', async () => {
    requestAccessToken.mockResolvedValue({ value: 'fresh', expiresAt: Date.now() + 3_600_000 })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'sign in' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'))

    await userEvent.click(screen.getByRole('button', { name: 'sign out' }))
    await waitFor(() => expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull())
  })

  it('signs out rather than popping up when the token ages out mid-session', async () => {
    // Google handed back a token that is already past its usable window.
    requestAccessToken.mockResolvedValue({ value: 'aged', expiresAt: Date.now() - 1 })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'sign in' }))
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-in'))

    await userEvent.click(screen.getByRole('button', { name: 'get token' }))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('signed-out'))
    // No second popup: renewal needs a user gesture, so the user goes back to login.
    expect(requestAccessToken).toHaveBeenCalledTimes(1)
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
  })
})
