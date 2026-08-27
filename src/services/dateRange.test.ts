import {
  RANGE_PRESETS,
  daysUntil,
  formatRangePreset,
  isRangePreset,
  formatDaysRemaining,
  isoDaysFromToday,
  resolveDateRange,
  toIsoDateString,
} from './dateRange'

const TODAY = new Date(2026, 1, 20) // 20 Feb 2026, local time

describe('resolveDateRange', () => {
  it('spans forward only for a "next" preset', () => {
    const { start, end } = resolveDateRange({ kind: 'preset', preset: 'next-30' }, TODAY)
    expect(toIsoDateString(start)).toBe('2026-02-20')
    expect(toIsoDateString(end)).toBe('2026-03-22')
  })

  it('spans backward only for a "past" preset, ending today', () => {
    const { start, end } = resolveDateRange({ kind: 'preset', preset: 'past-30' }, TODAY)
    expect(toIsoDateString(start)).toBe('2026-01-21')
    expect(toIsoDateString(end)).toBe('2026-02-20')
  })

  it('spans both directions for the default around-30 preset', () => {
    const { start, end } = resolveDateRange({ kind: 'preset', preset: 'around-30' }, TODAY)
    expect(toIsoDateString(start)).toBe('2026-01-21')
    expect(toIsoDateString(end)).toBe('2026-03-22')
  })

  it('accepts a fully past custom range', () => {
    const { start, end } = resolveDateRange(
      { kind: 'custom', start: '2025-01-01', end: '2025-12-31' },
      TODAY,
    )
    expect(toIsoDateString(start)).toBe('2025-01-01')
    expect(toIsoDateString(end)).toBe('2025-12-31')
    expect(start.getTime()).toBeLessThan(end.getTime())
  })

  it('uses the custom range verbatim', () => {
    const { start, end } = resolveDateRange(
      { kind: 'custom', start: '2026-03-01', end: '2026-03-31' },
      TODAY,
    )
    expect(toIsoDateString(start)).toBe('2026-03-01')
    expect(toIsoDateString(end)).toBe('2026-03-31')
  })

  it('swaps a backwards custom range instead of failing', () => {
    const { start, end } = resolveDateRange(
      { kind: 'custom', start: '2026-03-31', end: '2026-03-01' },
      TODAY,
    )
    expect(start.getTime()).toBeLessThan(end.getTime())
  })
})

describe('daysUntil', () => {
  it('counts whole calendar days', () => {
    expect(daysUntil('2026-02-20', TODAY)).toBe(0)
    expect(daysUntil('2026-02-21', TODAY)).toBe(1)
    expect(daysUntil('2026-03-01', TODAY)).toBe(9)
  })

  it('handles a leap day without an off-by-one', () => {
    const leapToday = new Date(2028, 1, 27)
    expect(daysUntil('2028-02-29', leapToday)).toBe(2)
    expect(daysUntil('2028-03-01', leapToday)).toBe(3)
  })

  it('returns a negative count for past dates', () => {
    expect(daysUntil('2026-02-18', TODAY)).toBe(-2)
  })
})

describe('formatDaysRemaining', () => {
  it('uses friendly wording near today', () => {
    expect(formatDaysRemaining(0)).toBe('Today')
    expect(formatDaysRemaining(1)).toBe('Tomorrow')
    expect(formatDaysRemaining(12)).toBe('in 12 days')
    expect(formatDaysRemaining(-3)).toBe('3 days ago')
  })
})

describe('isoDaysFromToday', () => {
  it('offsets by whole days', () => {
    expect(isoDaysFromToday(30, TODAY)).toBe('2026-03-22')
  })
})

describe('range presets', () => {
  it('offers the two-sided window first, then upcoming, then past', () => {
    expect(RANGE_PRESETS.map((preset) => preset.id)).toEqual([
      'around-30',
      'next-30',
      'next-60',
      'next-90',
      'past-30',
      'past-60',
      'past-90',
    ])
  })

  it('labels each preset', () => {
    expect(formatRangePreset('around-30')).toBe('Last 30 and next 30 days')
    expect(formatRangePreset('next-30')).toBe('Next 30 days')
    expect(formatRangePreset('past-90')).toBe('Past 90 days')
  })

  it('produces a forward-going window for every preset', () => {
    for (const preset of RANGE_PRESETS) {
      const { start, end } = resolveDateRange({ kind: 'preset', preset: preset.id }, TODAY)
      expect(start.getTime()).toBeLessThan(end.getTime())
    }
  })

  it('recognises only known preset ids', () => {
    expect(isRangePreset('around-30')).toBe(true)
    expect(isRangePreset('custom')).toBe(false)
    expect(isRangePreset(30)).toBe(false)
  })
})

describe('isoDaysFromToday with a negative offset', () => {
  it('walks backwards', () => {
    expect(isoDaysFromToday(-30, TODAY)).toBe('2026-01-21')
  })
})
