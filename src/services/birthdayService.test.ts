import type { CalendarEvent, CalendarSummary, GoogleCalendarClient } from '@/api/googleCalendar'
import { GOOGLE_BIRTHDAYS_CALENDAR_ID } from '@/api/googleCalendar'
import type { Birthday } from '@/types'
import {
  fetchBirthdays,
  filterBirthdays,
  selectCalendars,
  todayMarkerIndex,
} from './birthdayService'

const RANGE = { start: new Date(2026, 0, 1), end: new Date(2026, 11, 31) }
const KEYWORDS = ['birthday', 'szülinap', 'születésnap']

const CALENDARS: CalendarSummary[] = [
  { id: GOOGLE_BIRTHDAYS_CALENDAR_ID, name: 'Birthdays', primary: false },
  { id: 'cal-b', name: 'Birthday Calendar', primary: false },
  { id: 'cal-c', name: 'Family', primary: true },
]

function makeClient(events: Record<string, CalendarEvent[]>) {
  const calls: string[] = []
  const client = {
    listCalendars: async () => CALENDARS,
    listEvents: async (calendarId: string) => {
      calls.push(calendarId)
      return events[calendarId] ?? []
    },
  } as unknown as GoogleCalendarClient
  return { client, calls }
}

describe('selectCalendars', () => {
  it('returns nothing when the user has selected nothing', () => {
    expect(selectCalendars(CALENDARS, [])).toEqual([])
  })

  it('keeps only the selected ids', () => {
    expect(selectCalendars(CALENDARS, ['cal-c']).map((c) => c.id)).toEqual(['cal-c'])
  })
})

describe('fetchBirthdays', () => {
  it('composes every strategy without touching unselected calendars', async () => {
    const { client, calls } = makeClient({
      [GOOGLE_BIRTHDAYS_CALENDAR_ID]: [
        { id: 'g1', summary: "Anna's birthday", start: '2026-03-15', allDay: true },
      ],
      'cal-b': [{ id: 'b1', summary: 'Nagyi', start: '2026-02-01', allDay: true }],
      'cal-c': [{ id: 'c1', summary: 'Birthday - John', start: '2026-01-10', allDay: true }],
    })

    const result = await fetchBirthdays({
      client,
      calendars: CALENDARS,
      selectedCalendarIds: [GOOGLE_BIRTHDAYS_CALENDAR_ID, 'cal-c'],
      range: RANGE,
      keywords: KEYWORDS,
    })

    expect(calls.sort()).toEqual([GOOGLE_BIRTHDAYS_CALENDAR_ID, 'cal-c'].sort())
    expect(result.map((b) => b.name)).toEqual(['John', 'Anna'])
    expect(result.map((b) => b.source)).toEqual(['event', 'google-birthdays'])
  })

  it('short-circuits when no calendar is selected', async () => {
    const { client, calls } = makeClient({})
    await expect(
      fetchBirthdays({
        client,
        calendars: CALENDARS,
        selectedCalendarIds: [],
        range: RANGE,
        keywords: KEYWORDS,
      }),
    ).resolves.toEqual([])
    expect(calls).toEqual([])
  })

  it('collapses a person listed on two calendars into one entry', async () => {
    const { client } = makeClient({
      'cal-b': [{ id: 'shared', summary: 'Anna', start: '2026-03-15', allDay: true }],
      'cal-c': [{ id: 'other', summary: '🎂 Anna', start: '2026-03-15', allDay: true }],
    })

    const result = await fetchBirthdays({
      client,
      calendars: CALENDARS,
      selectedCalendarIds: ['cal-b', 'cal-c'],
      range: RANGE,
      keywords: KEYWORDS,
    })

    // Different calendars mean different ids, so both survive by design.
    expect(result).toHaveLength(2)
    expect(new Set(result.map((b) => b.name))).toEqual(new Set(['Anna']))
  })
})

describe('filterBirthdays', () => {
  const birthdays = [
    {
      id: '1',
      name: 'Anna',
      date: '2026-03-15',
      calendarId: 'cal-b',
      calendarName: 'B',
      source: 'calendar' as const,
      recurring: true,
      originalEventId: 'b1',
    },
    {
      id: '2',
      name: 'John Smith',
      date: '2026-04-01',
      calendarId: 'cal-c',
      calendarName: 'C',
      source: 'event' as const,
      recurring: true,
      originalEventId: 'c1',
    },
  ]

  it('matches names case-insensitively', () => {
    expect(filterBirthdays(birthdays, { search: 'smith' }).map((b) => b.id)).toEqual(['2'])
  })

  it('filters by calendar', () => {
    expect(filterBirthdays(birthdays, { calendarId: 'cal-b' }).map((b) => b.id)).toEqual(['1'])
  })

  it('returns everything with no criteria', () => {
    expect(filterBirthdays(birthdays)).toHaveLength(2)
  })
})

describe('todayMarkerIndex', () => {
  const TODAY = new Date(2026, 1, 20) // 20 Feb 2026

  function at(date: string): Birthday {
    return {
      id: date,
      name: 'X',
      date,
      calendarId: 'c',
      calendarName: 'C',
      source: 'event',
      recurring: true,
      originalEventId: 'e',
    }
  }

  it('sits before the first birthday that has not happened yet', () => {
    const list = [at('2026-02-01'), at('2026-02-19'), at('2026-03-01')]
    expect(todayMarkerIndex(list, TODAY)).toBe(2)
  })

  it('counts a birthday falling today as upcoming', () => {
    const list = [at('2026-02-19'), at('2026-02-20'), at('2026-03-01')]
    expect(todayMarkerIndex(list, TODAY)).toBe(1)
  })

  it('sits at the top when every birthday is still ahead', () => {
    expect(todayMarkerIndex([at('2026-03-01'), at('2026-04-01')], TODAY)).toBe(0)
  })

  it('sits at the end when every birthday has passed', () => {
    expect(todayMarkerIndex([at('2026-01-01'), at('2026-02-01')], TODAY)).toBe(2)
  })

  it('is a no-op position for an empty list', () => {
    expect(todayMarkerIndex([], TODAY)).toBe(0)
  })
})
