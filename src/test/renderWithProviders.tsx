import type { ReactElement, ReactNode } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext, type AuthContextValue } from '@/contexts/auth-context'

export const TEST_BASENAME = '/birthday-present-tracker'

export function createAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  const status = overrides.status ?? 'signed-in'
  return {
    status,
    isSignedIn: status === 'signed-in',
    error: null,
    configured: true,
    signIn: async () => {},
    signOut: async () => {},
    getAccessToken: async () => 'test-token',
    ...overrides,
  }
}

export interface RenderOptions {
  route?: string
  auth?: Partial<AuthContextValue>
}

export function renderWithProviders(
  ui: ReactElement,
  { route = '/', auth = {} }: RenderOptions = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={createAuthValue(auth)}>
        <MemoryRouter initialEntries={[`${TEST_BASENAME}${route}`]} basename={TEST_BASENAME}>
          {children}
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )

  return { queryClient, ...render(ui, { wrapper }) }
}
