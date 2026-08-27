import type { CalendarEvent, CalendarSummary, GoogleCalendarClient } from '@/api/googleCalendar'
import { GOOGLE_BIRTHDAYS_CALENDAR_ID } from '@/api/googleCalendar'
import { CalendarBirthdayProvider, isDedicatedBirthdayCalendar } from './CalendarBirthdayProvider'
import { EventBirthdayProvider, extractBirthdayName, isOrdinaryCalendar } from './EventBirthdayProvider'
import { GoogleBirthdayProvider, extractContactName, isGoogleBirthdaysCalendar } from './GoogleBirthdayProvider'
import { dedupeBirthdays, stableEventId, toIsoDate } from './normalize'

const RANGE = { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) }
const KEYWORDS = ['birthday', 'szülinap', 'születésnap']

function calendar(id: string, name: string): CalendarSummary {
  return { id, name, primary: false }
}

function event(overrides: Partial<CalendarEvent> & { id: string }): CalendarEvent {
  return { summary: '', start: '2026-03-15', allDay: true, ...overrides }
}

function clientReturning(events: Record<string, CalendarEvent[]>): GoogleCalendarClient {
  return {
    listEvents: async (calendarId: string) => events[calendarId] ?? [],
    listCalendars: async () => [],
  } as unknown as GoogleCalendarClient
}

describe('calendar classification', () => {
  const google = calendar(GOOGLE_BIRTHDAYS_CALENDAR_ID, 'Birthdays')
  const dedicated = calendar('cal-b', 'Birthday Calendar')
  const ordinary = calendar('cal-c', 'Family')

  it('routes each calendar to exactly one strategy', () => {
    expect(isGoogleBirthdaysCalendar(google)).toBe(true)
    expect(isDedicatedBirthdayCalendar(google, KEYWORDS)).toBe(false)
    expect(isOrdinaryCalendar(google, KEYWORDS)).toBe(false)

    expect(isDedicatedBirthdayCalendar(dedicated, KEYWORDS)).toBe(true)
    expect(isOrdinaryCalendar(dedicated, KEYWORDS)).toBe(false)

    expect(isOrdinaryCalendar(ordinary, KEYWORDS)).toBe(true)
  })
})

describe('extractContactName', () => {
  it('strips the possessive birthday suffix Google adds', () => {
    expect(extractContactName("Anna's birthday", KEYWORDS)).toBe('Anna')
    expect(extractContactName('Anna’s Birthday', KEYWORDS)).toBe('Anna')
    expect(extractContactName('John Birthday', KEYWORDS)).toBe('John')
    expect(extractContactName('Béla születésnapja', KEYWORDS)).toBe('Béla')
    expect(extractContactName('Béla', KEYWORDS)).toBe('Béla')
  })
})

describe('extractBirthdayName', () => {
  it.each([
    ['Birthday - John', 'John'],
    ['Birthday: John Smith', 'John Smith'],
    ['🎂 Anna', 'Anna'],
    ['🎉🎁 Anna Kovács', 'Anna Kovács'],
    ["Peter's birthday", 'Peter'],
    // Hungarian: keyword after the name, and with a possessive suffix glued on.
    ['Anna szülinap', 'Anna'],
    ['Anna szülinapja', 'Anna'],
    ['Béla születésnapja', 'Béla'],
    ['születésnap - Kovács Béla', 'Kovács Béla'],
    ['SZÜLINAP: Anna', 'Anna'],
    // Accents left off by the author still match.
    ['Anna szulinap', 'Anna'],
  ])('parses %s', (summary, expected) => {
    expect(extractBirthdayName(summary, KEYWORDS)).toBe(expected)
  })

  it('keeps the whole title when it is nothing but a keyword', () => {
    expect(extractBirthdayName('Szülinap', KEYWORDS)).toBe('Szülinap')
  })

  it('ignores unrelated events', () => {
    expect(extractBirthdayName('Team standup', KEYWORDS)).toBeNull()
    expect(extractBirthdayName('', KEYWORDS)).toBeNull()
  })

  it('honours a custom keyword list', () => {
    expect(extractBirthdayName('Anna Geburtstag', KEYWORDS)).toBeNull()
    expect(extractBirthdayName('Anna Geburtstag', ['geburtstag'])).toBe('Anna')
    expect(extractBirthdayName('Birthday - John', ['geburtstag'])).toBeNull()
  })
})

describe('normalize', () => {
  it('derives a stable id from recurring instances', () => {
    expect(stableEventId(event({ id: 'abc_20260315' }))).toBe('abc')
    expect(stableEventId(event({ id: 'inst', recurringEventId: 'base' }))).toBe('base')
  })

  it('normalizes date-times down to a calendar date', () => {
    expect(toIsoDate('2026-03-15')).toBe('2026-03-15')
    expect(toIsoDate('2026-03-15T09:30:00+01:00')).toMatch(/^2026-03-15$/)
    expect(toIsoDate('not-a-date')).toBe('')
  })

  it('dedupes by id keeping the earliest occurrence, sorted by date', () => {
    const base = {
      name: 'Anna',
      calendarId: 'c',
      calendarName: 'C',
      source: 'event' as const,
      recurring: true,
      originalEventId: 'e',
    }
    const result = dedupeBirthdays([
      { ...base, id: 'a', date: '2026-05-01' },
      { ...base, id: 'a', date: '2026-03-01' },
      { ...base, id: 'b', date: '2026-04-01' },
    ])

    expect(result.map((b) => [b.id, b.date])).toEqual([
      ['a', '2026-03-01'],
      ['b', '2026-04-01'],
    ])
  })
})

describe('providers normalize to the canonical model', () => {
  it('GoogleBirthdayProvider reads only the contacts calendar', async () => {
    const client = clientReturning({
      [GOOGLE_BIRTHDAYS_CALENDAR_ID]: [event({ id: 'g1_20260315', summary: "Anna's birthday" })],
      'cal-c': [event({ id: 'x', summary: '🎂 Ignored' })],
    })
    const provider = new GoogleBirthdayProvider(
      client,
      [calendar(GOOGLE_BIRTHDAYS_CALENDAR_ID, 'Birthdays'), calendar('cal-c', 'Family')],
      KEYWORDS,
    )

    const [birthday, ...rest] = await provider.getBirthdays(RANGE)
    expect(rest).toHaveLength(0)
    expect(birthday).toMatchObject({
      name: 'Anna',
      date: '2026-03-15',
      source: 'google-birthdays',
      calendarId: GOOGLE_BIRTHDAYS_CALENDAR_ID,
      originalEventId: 'g1',
      recurring: true,
    })
  })

  it('CalendarBirthdayProvider treats every event on the calendar as a birthday', async () => {
    const client = clientReturning({
      'cal-b': [event({ id: 'b1', summary: 'Nagyi' }), event({ id: 'b2', summary: '🎂 Peter' })],
    })
    const provider = new CalendarBirthdayProvider(
      client,
      [calendar('cal-b', 'Birthday Calendar')],
      KEYWORDS,
    )

    const result = await provider.getBirthdays(RANGE)
    expect(result.map((b) => b.name)).toEqual(['Nagyi', 'Peter'])
    expect(result.every((b) => b.source === 'calendar')).toBe(true)
  })

  it('EventBirthdayProvider keeps only title-pattern matches', async () => {
    const client = clientReturning({
      'cal-c': [
        event({ id: 'e1', summary: 'Birthday - John' }),
        event({ id: 'e2', summary: 'Team standup' }),
      ],
    })
    const provider = new EventBirthdayProvider(client, [calendar('cal-c', 'Family')], KEYWORDS)

    const result = await provider.getBirthdays(RANGE)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ name: 'John', source: 'event', calendarName: 'Family' })
  })
})
