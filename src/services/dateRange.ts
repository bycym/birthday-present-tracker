import type { DateRange, SearchRangePreset } from '@/types'

export type RangePreset = SearchRangePreset

export type SearchRange =
  | { kind: 'preset'; preset: RangePreset }
  | { kind: 'custom'; start: string; end: string }

export interface RangePresetDefinition {
  id: RangePreset
  label: string
  /** Days before today that the window covers. */
  before: number
  /** Days after today that the window covers. */
  after: number
}

/** Display order for the range dropdown; the first entry is the default. */
export const RANGE_PRESETS: RangePresetDefinition[] = [
  { id: 'around-30', label: 'Last 30 and next 30 days', before: 30, after: 30 },
  { id: 'next-30', label: 'Next 30 days', before: 0, after: 30 },
  { id: 'next-60', label: 'Next 60 days', before: 0, after: 60 },
  { id: 'next-90', label: 'Next 90 days', before: 0, after: 90 },
  { id: 'past-30', label: 'Past 30 days', before: 30, after: 0 },
  { id: 'past-60', label: 'Past 60 days', before: 60, after: 0 },
  { id: 'past-90', label: 'Past 90 days', before: 90, after: 0 },
]

const PRESETS_BY_ID = new Map(RANGE_PRESETS.map((preset) => [preset.id, preset]))

export function isRangePreset(value: unknown): value is RangePreset {
  return typeof value === 'string' && PRESETS_BY_ID.has(value as RangePreset)
}

export function getRangePreset(id: RangePreset): RangePresetDefinition {
  return PRESETS_BY_ID.get(id) ?? RANGE_PRESETS[0]
}

export function formatRangePreset(id: RangePreset): string {
  return getRangePreset(id).label
}

const MS_PER_DAY = 86_400_000

export function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function endOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(23, 59, 59, 999)
  return copy
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

export function toIsoDateString(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Turns a UI range choice into concrete timestamps for the Calendar API. */
export function resolveDateRange(range: SearchRange, today = new Date()): DateRange {
  const start = startOfDay(today)

  if (range.kind === 'custom') {
    const customStart = startOfDay(parseIsoDate(range.start))
    const customEnd = endOfDay(parseIsoDate(range.end))
    // A backwards range would make the API error; swap instead of failing.
    return customStart <= customEnd
      ? { start: customStart, end: customEnd }
      : { start: customEnd, end: endOfDay(parseIsoDate(range.start)) }
  }

  const { before, after } = getRangePreset(range.preset)

  return {
    start: startOfDay(new Date(start.getTime() - before * MS_PER_DAY)),
    end: endOfDay(new Date(start.getTime() + after * MS_PER_DAY)),
  }
}

/**
 * Whole days between today and an ISO birthday date. Calendar-day based, so
 * DST shifts and leap days cannot produce an off-by-one.
 */
export function daysUntil(isoDate: string, today = new Date()): number {
  const target = startOfDay(parseIsoDate(isoDate))
  const from = startOfDay(today)
  return Math.round((target.getTime() - from.getTime()) / MS_PER_DAY)
}

export function formatDaysRemaining(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 0) return `${Math.abs(days)} days ago`
  return `in ${days} days`
}

export function currentIsoToday(today = new Date()): string {
  return toIsoDateString(today)
}

export function isoDaysFromToday(days: number, today = new Date()): string {
  return toIsoDateString(new Date(startOfDay(today).getTime() + days * MS_PER_DAY))
}
