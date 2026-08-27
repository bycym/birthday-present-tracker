export type BirthdaySource = 'google-birthdays' | 'calendar' | 'event'

export interface Birthday {
  id: string
  name: string
  date: string
  calendarId: string
  calendarName: string
  source: BirthdaySource
  recurring: boolean
  originalEventId: string
}

export interface GiftRecord {
  birthdayId: string
  year: number
  purchased: boolean
  delivered: boolean
  budget: number | null
  actualCost: number | null
  description: string
  notes: string
}

/**
 * Named search windows. `around-30` spans both directions; the rest are
 * one-sided. Ids rather than day counts, because a two-sided window is not
 * expressible as a single signed number.
 */
export type SearchRangePreset =
  | 'around-30'
  | 'next-30'
  | 'next-60'
  | 'next-90'
  | 'past-30'
  | 'past-60'
  | 'past-90'

/** Colour palettes offered in Settings. */
export type Palette = 'coral' | 'citrus' | 'pastel'

export interface Settings {
  selectedCalendars: string[]
  defaultSearchRange: SearchRangePreset | 'custom'
  theme: 'light' | 'dark' | 'system'
  palette: Palette
  /** Words that mark an ordinary calendar event as a birthday. */
  birthdayKeywords: string[]
  /** How long cached birthdays stay fresh before Google is asked again. */
  cacheTtlHours: number
}

export interface DateRange {
  start: Date
  end: Date
}
