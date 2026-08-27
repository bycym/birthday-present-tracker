import { screen, waitFor } from '@testing-library/react'
import App from '@/App'
import { renderWithProviders } from '@/test/renderWithProviders'

vi.mock('@/hooks/useCalendars', () => ({
  calendarsQueryKey: ['calendars'],
  useCalendars: () => ({ data: [], isLoading: false, error: null }),
}))

describe('App routing', () => {
  it('renders the dashboard at the root route when signed in', async () => {
    renderWithProviders(<App />, { route: '/' })
    expect(
      await screen.findByRole('heading', { name: /upcoming birthdays/i }),
    ).toBeInTheDocument()
  })

  it('renders the settings page', async () => {
    renderWithProviders(<App />, { route: '/settings' })
    expect(await screen.findByRole('heading', { name: /^settings$/i })).toBeInTheDocument()
  })

  it('renders the about page', async () => {
    renderWithProviders(<App />, { route: '/about' })
    expect(await screen.findByRole('heading', { name: /about/i })).toBeInTheDocument()
  })

  it('renders the login page', async () => {
    renderWithProviders(<App />, { route: '/login', auth: { status: 'signed-out' } })
    expect(await screen.findByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
  })

  it('redirects a signed-out visitor away from the dashboard', async () => {
    renderWithProviders(<App />, { route: '/', auth: { status: 'signed-out' } })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument(),
    )
    expect(screen.queryByRole('heading', { name: /upcoming birthdays/i })).not.toBeInTheDocument()
  })
})
