import type { CalendarEvent, CalendarSummary, GoogleCalendarClient } from '@/api/googleCalendar'
import { BirthdayCacheRepository, BirthdayGiftTrackerDB } from '@/db'
import { OfflineError } from './birthdayCache'
import { loadBirthdays } from './birthdayService'
import { parseIsoDate } from './dateRange'

const NOW = new Date(2026, 1, 20)
const HOUR = 3_600_000

const CALENDARS: CalendarSummary[] = [{ id: 'cal-c', name: 'Family', primary: true }]
const KEYWORDS = ['birthday']
const RANGE = { start: parseIsoDate('2026-02-01'), end: parseIsoDate('2026-03-31') }

let db: BirthdayGiftTrackerDB
let cache: BirthdayCacheRepository

beforeEach(async () => {
  db = new BirthdayGiftTrackerDB(`cache-test-${crypto.randomUUID()}`)
  await db.open()
  cache = new BirthdayCacheRepository(db)
})

afterEach(async () => {
  await db.delete()
  setOnline(true)
})

/** jsdom's navigator.onLine is writable through a redefined property. */
function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true })
}

function makeClient(events: CalendarEvent[], onCall?: () => void) {
  let calls = 0
  const client = {
    listCalendars: async () => CALENDARS,
    listEvents: async () => {
      calls += 1
      onCall?.()
      return events
    },
  } as unknown as GoogleCalendarClient
  return { client, calls: () => calls }
}

const EVENTS: CalendarEvent[] = [
  { id: 'e1', summary: 'Birthday - John', start: '2026-03-15', allDay: true },
  { id: 'e2', summary: 'Birthday - Old', start: '2025-12-01', allDay: true },
]

const BASE = {
  calendars: CALENDARS,
  selectedCalendarIds: ['cal-c'],
  keywords: KEYWORDS,
  range: RANGE,
  ttlMs: 24 * HOUR,
  now: NOW,
}

describe('loadBirthdays', () => {
  it('fetches from Google on a cold cache and stores the wide window', async () => {
    const { client, calls } = makeClient(EVENTS)

    const result = await loadBirthdays({ ...BASE, client, cache })

    expect(result.source).toBe('network')
    expect(result.birthdays.map((b) => b.name)).toEqual(['John'])
    expect(calls()).toBe(1)

    // The cache keeps everything fetched, not just the visible slice.
    const stored = await cache.read()
    expect(stored?.birthdays.map((b) => b.name).sort()).toEqual(['John', 'Old'])
    expect(stored?.meta.coverageStart).toBe('2025-11-22')
  })

  it('serves a second call from the cache without touching the network', async () => {
    const first = makeClient(EVENTS)
    await loadBirthdays({ ...BASE, client: first.client, cache })

    const second = makeClient(EVENTS)
    const result = await loadBirthdays({ ...BASE, client: second.client, cache })

    expect(result.source).toBe('cache')
    expect(result.fetchedAt).toBe(NOW.getTime())
    expect(second.calls()).toBe(0)
  })

  it('refetches once the TTL has passed', async () => {
    const first = makeClient(EVENTS)
    await loadBirthdays({ ...BASE, client: first.client, cache })

    const later = new Date(NOW.getTime() + 25 * HOUR)
    const second = makeClient(EVENTS)
    const result = await loadBirthdays({ ...BASE, client: second.client, cache, now: later })

    expect(result.source).toBe('network')
    expect(second.calls()).toBe(1)
  })

  it('refetches when the calendar selection changes', async () => {
    const first = makeClient(EVENTS)
    await loadBirthdays({ ...BASE, client: first.client, cache })

    const second = makeClient(EVENTS)
    await loadBirthdays({
      ...BASE,
      client: second.client,
      cache,
      calendars: [...CALENDARS, { id: 'cal-d', name: 'Work', primary: false }],
      selectedCalendarIds: ['cal-c', 'cal-d'],
    })

    expect(second.calls()).toBeGreaterThan(0)
  })

  it('refetches when the keywords change', async () => {
    const first = makeClient(EVENTS)
    await loadBirthdays({ ...BASE, client: first.client, cache })

    const second = makeClient(EVENTS)
    await loadBirthdays({ ...BASE, client: second.client, cache, keywords: ['geburtstag'] })

    expect(second.calls()).toBe(1)
  })

  it('falls back to stale data when the network fails', async () => {
    const first = makeClient(EVENTS)
    await loadBirthdays({ ...BASE, client: first.client, cache })

    const failing = {
      listCalendars: async () => CALENDARS,
      listEvents: async () => {
        throw new Error('offline')
      },
    } as unknown as GoogleCalendarClient

    const later = new Date(NOW.getTime() + 25 * HOUR)
    const result = await loadBirthdays({ ...BASE, client: failing, cache, now: later })

    expect(result.source).toBe('stale-cache')
    expect(result.birthdays.map((b) => b.name)).toEqual(['John'])
    expect(result.fetchedAt).toBe(NOW.getTime())
  })

  it('surfaces the error when the network fails with no usable cache', async () => {
    const failing = {
      listCalendars: async () => CALENDARS,
      listEvents: async () => {
        throw new Error('offline')
      },
    } as unknown as GoogleCalendarClient

    await expect(loadBirthdays({ ...BASE, client: failing, cache })).rejects.toThrow('offline')
  })

  it('short-circuits with no calendars selected', async () => {
    const { client, calls } = makeClient(EVENTS)
    const result = await loadBirthdays({ ...BASE, client, cache, selectedCalendarIds: [] })

    expect(result.birthdays).toEqual([])
    expect(calls()).toBe(0)
  })

  it('clearing the cache forces the next call back to the network', async () => {
    const first = makeClient(EVENTS)
    await loadBirthdays({ ...BASE, client: first.client, cache })
    await cache.clear()

    const second = makeClient(EVENTS)
    const result = await loadBirthdays({ ...BASE, client: second.client, cache })

    expect(result.source).toBe('network')
    expect(second.calls()).toBe(1)
  })
})

describe('loadBirthdays while offline', () => {
  it('serves the cache without attempting a request', async () => {
    const first = makeClient(EVENTS)
    await loadBirthdays({ ...BASE, client: first.client, cache })

    setOnline(false)
    const second = makeClient(EVENTS)
    const result = await loadBirthdays({ ...BASE, client: second.client, cache })

    expect(result.source).toBe('cache')
    expect(result.birthdays.map((b) => b.name)).toEqual(['John'])
    expect(second.calls()).toBe(0)
  })

  it('serves a stale cache rather than erroring', async () => {
    const first = makeClient(EVENTS)
    await loadBirthdays({ ...BASE, client: first.client, cache })

    setOnline(false)
    const later = new Date(NOW.getTime() + 25 * HOUR)
    const second = makeClient(EVENTS)
    const result = await loadBirthdays({ ...BASE, client: second.client, cache, now: later })

    expect(result.source).toBe('stale-cache')
    expect(second.calls()).toBe(0)
  })

  it('reports a clear error when nothing cached fits the request', async () => {
    setOnline(false)
    const { client } = makeClient(EVENTS)

    await expect(loadBirthdays({ ...BASE, client, cache })).rejects.toBeInstanceOf(OfflineError)
  })

  it('markStale keeps the rows, so an offline refresh still shows data', async () => {
    const first = makeClient(EVENTS)
    await loadBirthdays({ ...BASE, client: first.client, cache })

    await cache.markStale()
    const stored = await cache.read()
    expect(stored?.birthdays).toHaveLength(2)
    expect(stored?.meta.fetchedAt).toBe(0)

    setOnline(false)
    const second = makeClient(EVENTS)
    const result = await loadBirthdays({ ...BASE, client: second.client, cache })

    expect(result.source).toBe('stale-cache')
    expect(result.birthdays.map((b) => b.name)).toEqual(['John'])
  })

  it('a failed online refresh still falls back to the kept rows', async () => {
    const first = makeClient(EVENTS)
    await loadBirthdays({ ...BASE, client: first.client, cache })
    await cache.markStale()

    const failing = {
      listCalendars: async () => CALENDARS,
      listEvents: async () => {
        throw new Error('network down')
      },
    } as unknown as GoogleCalendarClient

    const result = await loadBirthdays({ ...BASE, client: failing, cache })
    expect(result.source).toBe('stale-cache')
    expect(result.birthdays.map((b) => b.name)).toEqual(['John'])
  })
})
