import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useSettings } from '@/hooks/useSettings'
import { isoDaysFromToday, type SearchRange } from '@/services/dateRange'
import type { Birthday } from '@/types'
import { useBirthdays } from './useBirthdays'

/**
 * A full year either side, so a deep-linked birthday is found whatever the
 * dashboard range was — including one that has already passed.
 */
const LOOKUP_DAYS = 366

/**
 * Resolves a single birthday by id. Navigating from the dashboard carries the
 * record in router state; a deep link or refresh falls back to a wide fetch.
 */
export function useBirthday(id: string | undefined) {
  const location = useLocation()
  const fromState = (location.state as { birthday?: Birthday } | null)?.birthday
  const hasState = Boolean(fromState && fromState.id === id)

  const { settings } = useSettings()
  const range = useMemo<SearchRange>(
    () => ({
      kind: 'custom',
      start: isoDaysFromToday(-LOOKUP_DAYS),
      end: isoDaysFromToday(LOOKUP_DAYS),
    }),
    [],
  )

  const query = useBirthdays({
    selectedCalendarIds: hasState ? [] : settings.selectedCalendars,
    range,
    keywords: settings.birthdayKeywords,
    ttlHours: settings.cacheTtlHours,
  })

  const birthday = hasState
    ? fromState
    : query.birthdays.find((candidate) => candidate.id === id)

  return {
    birthday,
    isLoading: hasState ? false : query.isLoading,
    error: hasState ? null : query.error,
  }
}
