import type { BirthdayCacheMeta } from '@/db'
import type { Birthday } from '@/types'
import { cacheCoverage, judgeCache, sliceToRange } from './birthdayCache'
import { parseIsoDate } from './dateRange'

const NOW = new Date(2026, 1, 20).getTime() // 20 Feb 2026
const HOUR = 3_600_000

function meta(overrides: Partial<BirthdayCacheMeta> = {}): BirthdayCacheMeta {
  return {
    id: 'birthday-cache',
    fetchedAt: NOW,
    coverageStart: '2025-11-22',
    coverageEnd: '2027-02-21',
    calendarIds: ['cal-a', 'cal-b'],
    keywords: ['birthday', 'szulinap'],
    ...overrides,
  }
}

const QUESTION = {
  calendarIds: ['cal-b', 'cal-a'],
  keywords: ['Birthday', 'Szülinap'],
  range: { start: parseIsoDate('2026-02-01'), end: parseIsoDate('2026-03-01') },
  ttlMs: 24 * HOUR,
  now: NOW,
}

describe('judgeCache', () => {
  it('is fresh inside the TTL', () => {
    expect(judgeCache(meta(), QUESTION)).toBe('fresh')
  })

  it('ignores calendar and keyword ordering, case and accents', () => {
    expect(judgeCache(meta({ calendarIds: ['cal-b', 'cal-a'] }), QUESTION)).toBe('fresh')
  })

  it('goes stale past the TTL', () => {
    expect(judgeCache(meta({ fetchedAt: NOW - 25 * HOUR }), QUESTION)).toBe('stale')
  })

  it('is unusable with no cache at all', () => {
    expect(judgeCache(null, QUESTION)).toBe('unusable')
  })

  it('is unusable when the calendar selection changed', () => {
    expect(judgeCache(meta({ calendarIds: ['cal-a'] }), QUESTION)).toBe('unusable')
  })

  it('is unusable when the keywords changed', () => {
    expect(judgeCache(meta({ keywords: ['geburtstag'] }), QUESTION)).toBe('unusable')
  })

  it('is unusable when the range reaches outside what was fetched', () => {
    const before = { ...QUESTION, range: { ...QUESTION.range, start: parseIsoDate('2025-01-01') } }
    const after = { ...QUESTION, range: { ...QUESTION.range, end: parseIsoDate('2030-01-01') } }
    expect(judgeCache(meta(), before)).toBe('unusable')
    expect(judgeCache(meta(), after)).toBe('unusable')
  })
})

describe('cacheCoverage', () => {
  it('spans 90 days back and a year forward', () => {
    expect(cacheCoverage(new Date(2026, 1, 20))).toEqual({
      start: '2025-11-22',
      end: '2027-02-21',
    })
  })
})

describe('sliceToRange', () => {
  const rows: Birthday[] = ['2026-01-01', '2026-02-15', '2026-03-01', '2026-06-01'].map(
    (date) => ({
      id: date,
      name: 'X',
      date,
      calendarId: 'c',
      calendarName: 'C',
      source: 'event',
      recurring: true,
      originalEventId: 'e',
    }),
  )

  it('keeps rows inside the range, inclusive at both ends', () => {
    const result = sliceToRange(rows, {
      start: parseIsoDate('2026-02-15'),
      end: parseIsoDate('2026-03-01'),
    })
    expect(result.map((row) => row.date)).toEqual(['2026-02-15', '2026-03-01'])
  })
})
