import type { DateRange } from '@/types'

const API_BASE = 'https://www.googleapis.com/calendar/v3'
const MAX_PAGES = 20

/** The fixed id Google uses for the auto-generated contact birthdays calendar. */
export const GOOGLE_BIRTHDAYS_CALENDAR_ID = 'addressbook#contacts@group.v.calendar.google.com'

export interface CalendarSummary {
  id: string
  name: string
  primary: boolean
  backgroundColor?: string
}

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  /** `YYYY-MM-DD` for all-day events, ISO date-time otherwise. */
  start: string
  allDay: boolean
  recurringEventId?: string
}

export class GoogleCalendarError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'GoogleCalendarError'
    this.status = status
  }
}

interface RawCalendarListEntry {
  id: string
  summary?: string
  summaryOverride?: string
  primary?: boolean
  backgroundColor?: string
  deleted?: boolean
}

interface RawEvent {
  id: string
  status?: string
  summary?: string
  description?: string
  start?: { date?: string; dateTime?: string }
  recurringEventId?: string
}

interface RawListResponse<T> {
  items?: T[]
  nextPageToken?: string
}

export type AccessTokenGetter = () => Promise<string>

export class GoogleCalendarClient {
  private readonly getAccessToken: AccessTokenGetter

  constructor(getAccessToken: AccessTokenGetter) {
    this.getAccessToken = getAccessToken
  }

  private async request<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const token = await this.getAccessToken()
    const url = new URL(`${API_BASE}${path}`)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      throw new GoogleCalendarError(
        response.status === 401
          ? 'Google session expired. Please sign in again.'
          : `Google Calendar request failed (${response.status}). ${body.slice(0, 200)}`,
        response.status,
      )
    }

    return (await response.json()) as T
  }

  /** Walks `nextPageToken` until exhausted, guarded against runaway loops. */
  private async requestAll<T>(path: string, params: Record<string, string>): Promise<T[]> {
    const items: T[] = []
    let pageToken: string | undefined

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const response: RawListResponse<T> = await this.request<RawListResponse<T>>(path, {
        ...params,
        ...(pageToken ? { pageToken } : {}),
      })
      items.push(...(response.items ?? []))
      pageToken = response.nextPageToken
      if (!pageToken) break
    }

    return items
  }

  async listCalendars(): Promise<CalendarSummary[]> {
    const entries = await this.requestAll<RawCalendarListEntry>('/users/me/calendarList', {
      maxResults: '250',
      minAccessRole: 'reader',
      showDeleted: 'false',
    })

    return entries
      .filter((entry) => !entry.deleted)
      .map((entry) => ({
        id: entry.id,
        name: entry.summaryOverride ?? entry.summary ?? entry.id,
        primary: entry.primary ?? false,
        backgroundColor: entry.backgroundColor,
      }))
      .sort((a, b) => Number(b.primary) - Number(a.primary) || a.name.localeCompare(b.name))
  }

  async listEvents(calendarId: string, range: DateRange): Promise<CalendarEvent[]> {
    const raw = await this.requestAll<RawEvent>(
      `/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        timeMin: range.start.toISOString(),
        timeMax: range.end.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      },
    )

    return raw
      .filter((event) => event.status !== 'cancelled' && Boolean(event.start))
      .map((event) => {
        const date = event.start?.date
        const dateTime = event.start?.dateTime
        return {
          id: event.id,
          summary: event.summary ?? '',
          description: event.description,
          start: date ?? dateTime ?? '',
          allDay: Boolean(date),
          recurringEventId: event.recurringEventId,
        }
      })
      .filter((event) => event.start !== '')
  }
}
