import type { CalendarSummary, GoogleCalendarClient } from '@/api/googleCalendar'
import {
  CalendarBirthdayProvider,
  EventBirthdayProvider,
  GoogleBirthdayProvider,
  dedupeBirthdays,
  type BirthdayProvider,
} from '@/providers'
import { birthdayCacheRepository, type BirthdayCacheRepository } from '@/db'
import { normalizeKeywords } from '@/providers'
import {
  OfflineError,
  cacheCoverage,
  isOnline,
  judgeCache,
  sliceToRange,
} from '@/services/birthdayCache'
import { parseIsoDate, startOfDay, toIsoDateString } from '@/services/dateRange'
import type { Birthday, DateRange } from '@/types'

/**
 * Builds one provider per birthday strategy over the calendars the user picked.
 * Adding a strategy means adding a constructor here — nothing else changes.
 */
export function createProviders(
  client: GoogleCalendarClient,
  calendars: CalendarSummary[],
  keywords: string[],
): BirthdayProvider[] {
  return [
    new GoogleBirthdayProvider(client, calendars, keywords),
    new CalendarBirthdayProvider(client, calendars, keywords),
    new EventBirthdayProvider(client, calendars, keywords),
  ]
}

export function selectCalendars(
  calendars: CalendarSummary[],
  selectedIds: string[],
): CalendarSummary[] {
  if (selectedIds.length === 0) return []
  const wanted = new Set(selectedIds)
  return calendars.filter((calendar) => wanted.has(calendar.id))
}

export interface FetchBirthdaysOptions {
  client: GoogleCalendarClient
  calendars: CalendarSummary[]
  selectedCalendarIds: string[]
  range: DateRange
  /** Words that mark an event title as a birthday. */
  keywords: string[]
}

/** Runs every provider in parallel and returns one deduped, date-sorted list. */
export async function fetchBirthdays({
  client,
  calendars,
  selectedCalendarIds,
  range,
  keywords,
}: FetchBirthdaysOptions): Promise<Birthday[]> {
  const selected = selectCalendars(calendars, selectedCalendarIds)
  if (selected.length === 0) return []

  const providers = createProviders(client, selected, keywords)
  const results = await Promise.all(providers.map((provider) => provider.getBirthdays(range)))

  return dedupeBirthdays(results.flat())
}

export function filterBirthdays(
  birthdays: Birthday[],
  { search = '', calendarId = 'all' }: { search?: string; calendarId?: string } = {},
): Birthday[] {
  const term = search.trim().toLowerCase()

  return birthdays.filter((birthday) => {
    if (calendarId !== 'all' && birthday.calendarId !== calendarId) return false
    if (!term) return true
    return birthday.name.toLowerCase().includes(term)
  })
}

/**
 * Where the "today" divider belongs in a date-sorted list: before the first
 * birthday that has not happened yet, or at the end when every one is past.
 */
export function todayMarkerIndex(birthdays: Birthday[], today = new Date()): number {
  const iso = toIsoDateString(startOfDay(today))
  const index = birthdays.findIndex((birthday) => birthday.date >= iso)
  return index === -1 ? birthdays.length : index
}

export type BirthdaysSource = 'network' | 'cache' | 'stale-cache'

export interface LoadBirthdaysResult {
  birthdays: Birthday[]
  source: BirthdaysSource
  /** When the underlying data was pulled from Google. */
  fetchedAt: number
}

export interface LoadBirthdaysOptions extends Omit<FetchBirthdaysOptions, 'range'> {
  range: DateRange
  ttlMs: number
  cache?: BirthdayCacheRepository
  now?: Date
}

/**
 * Serves birthdays from the IndexedDB cache when it still answers the question,
 * and otherwise refetches a wide window from Google and re-caches it.
 *
 * A network failure falls back to stale cached rows rather than showing an
 * error, which is what makes the app usable offline after the first visit.
 */
export async function loadBirthdays({
  client,
  calendars,
  selectedCalendarIds,
  range,
  keywords,
  ttlMs,
  cache = birthdayCacheRepository,
  now = new Date(),
}: LoadBirthdaysOptions): Promise<LoadBirthdaysResult> {
  if (selectedCalendarIds.length === 0) {
    return { birthdays: [], source: 'network', fetchedAt: now.getTime() }
  }

  const cached = await cache.read()
  const verdict = judgeCache(cached?.meta, {
    calendarIds: selectedCalendarIds,
    keywords,
    range,
    ttlMs,
    now: now.getTime(),
  })

  if (verdict === 'fresh' && cached) {
    return {
      birthdays: sliceToRange(cached.birthdays, range),
      source: 'cache',
      fetchedAt: cached.meta.fetchedAt,
    }
  }

  // Offline: serve whatever the cache holds rather than starting a request that
  // cannot succeed. Only a cache that does not fit the question is an error.
  if (!isOnline()) {
    if (cached && verdict !== 'unusable') {
      return {
        birthdays: sliceToRange(cached.birthdays, range),
        source: verdict === 'fresh' ? 'cache' : 'stale-cache',
        fetchedAt: cached.meta.fetchedAt,
      }
    }
    throw new OfflineError()
  }

  const coverage = cacheCoverage(now)

  try {
    const birthdays = await fetchBirthdays({
      client,
      calendars,
      selectedCalendarIds,
      keywords,
      // Always pull the whole window, so narrower ranges are answered locally.
      range: { start: parseIsoDate(coverage.start), end: parseIsoDate(coverage.end) },
    })

    await cache.write(
      {
        fetchedAt: now.getTime(),
        coverageStart: coverage.start,
        coverageEnd: coverage.end,
        calendarIds: [...selectedCalendarIds].sort(),
        keywords: normalizeKeywords(keywords).sort(),
      },
      birthdays,
    )

    return { birthdays: sliceToRange(birthdays, range), source: 'network', fetchedAt: now.getTime() }
  } catch (error) {
    if (verdict === 'stale' && cached) {
      return {
        birthdays: sliceToRange(cached.birthdays, range),
        source: 'stale-cache',
        fetchedAt: cached.meta.fetchedAt,
      }
    }
    throw error
  }
}
