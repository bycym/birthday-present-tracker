import type { CalendarSummary, GoogleCalendarClient } from '@/api/googleCalendar'
import type { Birthday, DateRange } from '@/types'
import type { BirthdayProvider } from './BirthdayProvider'
import { isDedicatedBirthdayCalendar } from './CalendarBirthdayProvider'
import { isGoogleBirthdaysCalendar } from './GoogleBirthdayProvider'
import { matchKeywords } from './keywords'
import { toBirthday } from './normalize'

/** Cake and party emoji mark a birthday on their own, whatever the keywords are. */
const BIRTHDAY_EMOJI = /^[\s]*(🎂|🎉|🥳|🎁)+[\s]*/u

/**
 * Strategy 3: ordinary calendars where birthdays are just events whose title
 * contains one of the user's keywords — "Birthday - John", "Anna szülinap",
 * "Béla születésnapja" — or starts with a birthday emoji.
 */
export function extractBirthdayName(summary: string, keywords: string[]): string | null {
  const title = summary.trim()
  if (!title) return null

  if (BIRTHDAY_EMOJI.test(title)) {
    const name = title.replace(BIRTHDAY_EMOJI, '').trim()
    return name || null
  }

  const { name, matched } = matchKeywords(title, keywords)
  return matched ? name : null
}

/** Ordinary calendars are everything the two dedicated strategies do not own. */
export function isOrdinaryCalendar(calendar: CalendarSummary, keywords: string[]): boolean {
  return !isGoogleBirthdaysCalendar(calendar) && !isDedicatedBirthdayCalendar(calendar, keywords)
}

export class EventBirthdayProvider implements BirthdayProvider {
  readonly source = 'event' as const

  private readonly client: GoogleCalendarClient
  private readonly calendars: CalendarSummary[]
  private readonly keywords: string[]

  constructor(client: GoogleCalendarClient, calendars: CalendarSummary[], keywords: string[]) {
    this.client = client
    this.keywords = keywords
    this.calendars = calendars.filter((calendar) => isOrdinaryCalendar(calendar, keywords))
  }

  async getBirthdays(range: DateRange): Promise<Birthday[]> {
    const perCalendar = await Promise.all(
      this.calendars.map(async (calendar) => {
        const events = await this.client.listEvents(calendar.id, range)
        return events
          .map((event) => {
            const name = extractBirthdayName(event.summary, this.keywords)
            return name ? toBirthday(event, calendar, this.source, name) : null
          })
          .filter((birthday): birthday is Birthday => birthday !== null)
      }),
    )

    return perCalendar.flat()
  }
}
