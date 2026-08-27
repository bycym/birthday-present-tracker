import { TINT_SLOTS, initialOf, tintSlot } from './tintSlot'

describe('tintSlot', () => {
  it('always lands inside the palette', () => {
    for (const key of ['a', 'cal-1:evt-9', '', 'Anna Kovács', '🎂']) {
      const slot = tintSlot(key)
      expect(slot).toBeGreaterThanOrEqual(1)
      expect(slot).toBeLessThanOrEqual(TINT_SLOTS)
    }
  })

  it('is stable for the same key, so a person keeps their colour', () => {
    expect(tintSlot('cal-1:evt-9')).toBe(tintSlot('cal-1:evt-9'))
  })

  it('spreads different keys across more than one slot', () => {
    const keys = Array.from({ length: 40 }, (_, index) => `cal-1:evt-${index}`)
    expect(new Set(keys.map(tintSlot)).size).toBeGreaterThan(1)
  })
})

describe('initialOf', () => {
  it('uppercases the first letter', () => {
    expect(initialOf('anna')).toBe('A')
    expect(initialOf('  béla ')).toBe('B')
  })

  it('handles multi-byte first characters', () => {
    expect(initialOf('🎂 party')).toBe('🎂')
  })

  it('falls back for an empty name', () => {
    expect(initialOf('   ')).toBe('?')
  })
})
