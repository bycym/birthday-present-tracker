import type { CalendarSummary, GoogleCalendarClient } from '@/api/googleCalendar'
import type { Birthday, DateRange } from '@/types'
import type { BirthdayProvider } from './BirthdayProvider'
import { extractBirthdayName } from './EventBirthdayProvider'
import { isGoogleBirthdaysCalendar } from './GoogleBirthdayProvider'
import { containsKeyword } from './keywords'
import { toBirthday } from './normalize'

/**
 * Strategy 2: a calendar whose own name contains a birthday keyword — every
 * event on it counts, so bare name titles like "Nagyi" still work.
 */
export function isDedicatedBirthdayCalendar(
  calendar: CalendarSummary,
  keywords: string[],
): boolean {
  return !isGoogleBirthdaysCalendar(calendar) && containsKeyword(calendar.name, keywords)
}

export class CalendarBirthdayProvider implements BirthdayProvider {
  readonly source = 'calendar' as const

  private readonly client: GoogleCalendarClient
  private readonly calendars: CalendarSummary[]
  private readonly keywords: string[]

  constructor(client: GoogleCalendarClient, calendars: CalendarSummary[], keywords: string[]) {
    this.client = client
    this.keywords = keywords
    this.calendars = calendars.filter((calendar) =>
      isDedicatedBirthdayCalendar(calendar, keywords),
    )
  }

  async getBirthdays(range: DateRange): Promise<Birthday[]> {
    const perCalendar = await Promise.all(
      this.calendars.map(async (calendar) => {
        const events = await this.client.listEvents(calendar.id, range)
        return events
          .map((event) => {
            // Titles here are usually bare names, but "Anna szülinap" still parses.
            const name = extractBirthdayName(event.summary, this.keywords) ?? event.summary
            return toBirthday(event, calendar, this.source, name)
          })
          .filter((birthday): birthday is Birthday => birthday !== null)
      }),
    )

    return perCalendar.flat()
  }
}
