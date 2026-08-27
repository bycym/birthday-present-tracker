import type { Birthday, DateRange } from '@/types'

/**
 * Common contract for every birthday source. Implementations receive the
 * calendars they are responsible for at construction time, so the UI never
 * needs to know which strategy produced a birthday.
 */
export interface BirthdayProvider {
  readonly source: Birthday['source']
  getBirthdays(range: DateRange): Promise<Birthday[]>
}
