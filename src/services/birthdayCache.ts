import type { BirthdayCacheMeta } from '@/db'
import { normalizeKeywords } from '@/providers'
import type { Birthday, DateRange } from '@/types'
import { isoDaysFromToday, toIsoDateString } from './dateRange'

/**
 * How much of the calendar a single fetch pulls down. Wide enough that every
 * preset range and most custom ranges are answered from one cached copy.
 */
export const CACHE_PAST_DAYS = 90
export const CACHE_FUTURE_DAYS = 366

export type CacheVerdict = 'fresh' | 'stale' | 'unusable'

export interface CacheQuestion {
  calendarIds: string[]
  keywords: string[]
  range: DateRange
  ttlMs: number
  now?: number
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const left = [...a].sort()
  const right = [...b].sort()
  return left.every((value, index) => value === right[index])
}

/** The window a fresh fetch will cover, expressed as ISO dates. */
export function cacheCoverage(today = new Date()): { start: string; end: string } {
  return {
    start: isoDaysFromToday(-CACHE_PAST_DAYS, today),
    end: isoDaysFromToday(CACHE_FUTURE_DAYS, today),
  }
}

/**
 * Decides whether cached rows can answer a request.
 *
 * `unusable` means the cache is about a different question (other calendars,
 * other keywords, or a range it never covered) and must be ignored. `stale`
 * means it answers the question but has aged past the TTL — good enough to show
 * while a refresh runs, or when the network is unavailable.
 */
export function judgeCache(
  meta: BirthdayCacheMeta | null | undefined,
  { calendarIds, keywords, range, ttlMs, now = Date.now() }: CacheQuestion,
): CacheVerdict {
  if (!meta) return 'unusable'
  if (!sameSet(meta.calendarIds, calendarIds)) return 'unusable'
  if (!sameSet(meta.keywords, normalizeKeywords(keywords))) return 'unusable'

  const wantedStart = toIsoDateString(range.start)
  const wantedEnd = toIsoDateString(range.end)
  if (wantedStart < meta.coverageStart || wantedEnd > meta.coverageEnd) return 'unusable'

  return now - meta.fetchedAt <= ttlMs ? 'fresh' : 'stale'
}

/** Narrows cached rows down to the range the dashboard is actually showing. */
export function sliceToRange(birthdays: Birthday[], range: DateRange): Birthday[] {
  const start = toIsoDateString(range.start)
  const end = toIsoDateString(range.end)
  return birthdays.filter((birthday) => birthday.date >= start && birthday.date <= end)
}

/** Browsers without the API are assumed online; only an explicit false counts. */
export function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

/** Thrown when there is no network and no cached rows that fit the request. */
export class OfflineError extends Error {
  constructor(
    message = 'You are offline and there is no saved copy for this selection yet.',
  ) {
    super(message)
    this.name = 'OfflineError'
  }
}
