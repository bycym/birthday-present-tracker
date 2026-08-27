import { formatAge } from './formatAge'

const NOW = 1_700_000_000_000
const MINUTE = 60_000

describe('formatAge', () => {
  it('uses minutes inside the hour', () => {
    expect(formatAge(NOW - 5 * MINUTE, NOW)).toMatch(/5 minutes ago/)
  })

  it('switches to hours past an hour, rounding by magnitude', () => {
    // Math.round(-1.5) is -1, which would wrongly read as "1 hour ago".
    expect(formatAge(NOW - 90 * MINUTE, NOW)).toMatch(/2 hours ago/)
    expect(formatAge(NOW - 121 * MINUTE, NOW)).toMatch(/2 hours ago/)
  })

  it('switches to days past a day', () => {
    expect(formatAge(NOW - 3 * 24 * 60 * MINUTE, NOW)).toMatch(/3 days ago/)
  })

  it('handles a 2-3 week gap, the expected usage pattern', () => {
    expect(formatAge(NOW - 18 * 24 * 60 * MINUTE, NOW)).toMatch(/18 days ago/)
  })
})
