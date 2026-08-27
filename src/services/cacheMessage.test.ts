import { cacheMessage } from './cacheMessage'

const NOW = 1_700_000_000_000
const DAY = 86_400_000

describe('cacheMessage', () => {
  it('leads with offline whatever the source says', () => {
    expect(cacheMessage('cache', NOW - 2 * DAY, false, NOW)).toMatch(/^Offline —/)
    expect(cacheMessage('stale-cache', NOW - 2 * DAY, false, NOW)).toMatch(/^Offline —/)
  })

  it('distinguishes a failed request from a healthy cache hit', () => {
    expect(cacheMessage('stale-cache', NOW - DAY, true, NOW)).toMatch(/Could not reach Google/)
    expect(cacheMessage('cache', NOW - DAY, true, NOW)).toMatch(/^Saved data from/)
  })

  it('reports a fresh network load', () => {
    expect(cacheMessage('network', NOW, true, NOW)).toMatch(/^Updated/)
  })
})
