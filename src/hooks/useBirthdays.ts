import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { loadBirthdays, type LoadBirthdaysResult } from '@/services/birthdayService'
import { resolveDateRange, type SearchRange } from '@/services/dateRange'

import { useCalendarClient } from './useCalendarClient'
import { useCalendars } from './useCalendars'

export interface UseBirthdaysOptions {
  selectedCalendarIds: string[]
  range: SearchRange
  keywords: string[]
  /** Cache lifetime in hours, from Settings. */
  ttlHours: number
}

export function birthdaysQueryKey(
  selectedCalendarIds: string[],
  range: SearchRange,
  keywords: string[],
) {
  // Keywords are part of the key so editing them in Settings refetches at once.
  return ['birthdays', [...selectedCalendarIds].sort(), range, [...keywords].sort()] as const
}

export function useBirthdays({
  selectedCalendarIds,
  range,
  keywords,
  ttlHours,
}: UseBirthdaysOptions) {
  const client = useCalendarClient()
  const { isSignedIn } = useAuth()
  const calendarsQuery = useCalendars()
  const calendars = calendarsQuery.data ?? []

  // A disabled query reports isLoading === false, which would make the dashboard
  // announce "no birthdays" during the window where calendars are still arriving.
  const enabled = isSignedIn && calendars.length > 0 && selectedCalendarIds.length > 0

  const query = useQuery<LoadBirthdaysResult>({
    queryKey: birthdaysQueryKey(selectedCalendarIds, range, keywords),
    queryFn: () =>
      loadBirthdays({
        client,
        calendars,
        selectedCalendarIds,
        range: resolveDateRange(range),
        keywords,
        ttlMs: ttlHours * 60 * 60 * 1000,
      }),
    enabled,
    // The IndexedDB cache owns freshness; this only avoids duplicate work
    // between remounts within a single visit.
    staleTime: 60 * 1000,
  })

  return {
    ...query,
    birthdays: query.data?.birthdays ?? [],
    source: query.data?.source,
    fetchedAt: query.data?.fetchedAt,
    calendars,
    isLoadingCalendars: calendarsQuery.isLoading,
    calendarsError: calendarsQuery.error,
    /** True while either the calendar list or the birthdays are still in flight. */
    isLoadingBirthdays: calendarsQuery.isLoading || (enabled && query.isPending),
  }
}
