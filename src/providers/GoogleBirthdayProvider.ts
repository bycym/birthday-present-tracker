import {
  GOOGLE_BIRTHDAYS_CALENDAR_ID,
  type CalendarSummary,
  type GoogleCalendarClient,
} from '@/api/googleCalendar'
import type { Birthday, DateRange } from '@/types'
import type { BirthdayProvider } from './BirthdayProvider'
import { matchKeywords } from './keywords'
import { toBirthday } from './normalize'

/** Strategy 1: the auto-generated Google Contacts "Birthdays" calendar. */
export function isGoogleBirthdaysCalendar(calendar: CalendarSummary): boolean {
  return calendar.id === GOOGLE_BIRTHDAYS_CALENDAR_ID
}

/**
 * Google writes these as "Anna's birthday", "Anna születésnapja" or, in some
 * locales, plain "Anna" — so strip any keyword and keep whatever is left.
 */
export function extractContactName(summary: string, keywords: string[]): string {
  const { name, matched } = matchKeywords(summary, keywords)
  return matched ? name : summary.trim()
}

export class GoogleBirthdayProvider implements BirthdayProvider {
  readonly source = 'google-birthdays' as const

  private readonly client: GoogleCalendarClient
  private readonly calendars: CalendarSummary[]
  private readonly keywords: string[]

  constructor(client: GoogleCalendarClient, calendars: CalendarSummary[], keywords: string[]) {
    this.client = client
    this.keywords = keywords
    this.calendars = calendars.filter(isGoogleBirthdaysCalendar)
  }

  async getBirthdays(range: DateRange): Promise<Birthday[]> {
    const perCalendar = await Promise.all(
      this.calendars.map(async (calendar) => {
        const events = await this.client.listEvents(calendar.id, range)
        return events
          .map((event) =>
            toBirthday(event, calendar, this.source, extractContactName(event.summary, this.keywords)),
          )
          .filter((birthday): birthday is Birthday => birthday !== null)
      }),
    )

    return perCalendar.flat()
  }
}
