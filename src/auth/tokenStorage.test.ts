import { TOKEN_STORAGE_KEY, clearToken, loadToken, saveToken } from './tokenStorage'

const NOW = 1_700_000_000_000

beforeEach(() => {
  sessionStorage.clear()
})

describe('tokenStorage', () => {
  it('round-trips a live token', () => {
    saveToken({ value: 'abc', expiresAt: NOW + 3_600_000 })
    expect(loadToken(NOW)).toEqual({ value: 'abc', expiresAt: NOW + 3_600_000 })
  })

  it('returns nothing when there is no stored token', () => {
    expect(loadToken(NOW)).toBeNull()
  })

  it('drops an expired token instead of returning it', () => {
    saveToken({ value: 'abc', expiresAt: NOW - 1 })
    expect(loadToken(NOW)).toBeNull()
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()
  })

  it('treats a token inside the expiry skew as expired', () => {
    saveToken({ value: 'abc', expiresAt: NOW + 30_000 })
    expect(loadToken(NOW)).toBeNull()
  })

  it('discards malformed entries', () => {
    sessionStorage.setItem(TOKEN_STORAGE_KEY, 'not json')
    expect(loadToken(NOW)).toBeNull()
    expect(sessionStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull()

    sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ value: 42 }))
    expect(loadToken(NOW)).toBeNull()
  })

  it('clearToken removes the entry', () => {
    saveToken({ value: 'abc', expiresAt: NOW + 3_600_000 })
    clearToken()
    expect(loadToken(NOW)).toBeNull()
  })

  it('never touches localStorage', () => {
    saveToken({ value: 'abc', expiresAt: NOW + 3_600_000 })
    expect(JSON.stringify(localStorage)).not.toContain('abc')
  })
})
