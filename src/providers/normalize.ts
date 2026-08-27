import type { CalendarEvent, CalendarSummary } from '@/api/googleCalendar'
import type { Birthday, BirthdaySource } from '@/types'

/** Recurring instances come back as `<baseId>_20260315`; the base id is stable across years. */
export function stableEventId(event: CalendarEvent): string {
  if (event.recurringEventId) return event.recurringEventId
  const separator = event.id.indexOf('_')
  return separator > 0 ? event.id.slice(0, separator) : event.id
}

/** Normalizes an all-day date or an ISO date-time down to `YYYY-MM-DD`. */
export function toIsoDate(start: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(start)) return start
  const parsed = new Date(start)
  if (Number.isNaN(parsed.getTime())) return ''
  const month = `${parsed.getMonth() + 1}`.padStart(2, '0')
  const day = `${parsed.getDate()}`.padStart(2, '0')
  return `${parsed.getFullYear()}-${month}-${day}`
}

export function toBirthday(
  event: CalendarEvent,
  calendar: CalendarSummary,
  source: BirthdaySource,
  name: string,
): Birthday | null {
  const date = toIsoDate(event.start)
  const trimmed = name.trim()
  if (!date || !trimmed) return null

  const originalEventId = stableEventId(event)

  return {
    // Stable across years so gift history keeps pointing at the same person.
    id: `${calendar.id}:${originalEventId}`,
    name: trimmed,
    date,
    calendarId: calendar.id,
    calendarName: calendar.name,
    source,
    recurring: Boolean(event.recurringEventId) || event.id !== originalEventId,
    originalEventId,
  }
}

/** Keeps the earliest occurrence when the same person shows up more than once. */
export function dedupeBirthdays(birthdays: Birthday[]): Birthday[] {
  const byId = new Map<string, Birthday>()

  for (const birthday of birthdays) {
    const existing = byId.get(birthday.id)
    if (!existing || birthday.date < existing.date) byId.set(birthday.id, birthday)
  }

  return [...byId.values()].sort((a, b) => a.date.localeCompare(b.date))
}
