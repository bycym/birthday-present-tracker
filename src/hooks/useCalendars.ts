import { useQuery } from '@tanstack/react-query'
import type { CalendarSummary } from '@/api/googleCalendar'
import { useAuth } from '@/contexts/auth-context'
import { useCalendarClient } from './useCalendarClient'

export const calendarsQueryKey = ['calendars'] as const

export function useCalendars() {
  const client = useCalendarClient()
  const { isSignedIn } = useAuth()

  return useQuery<CalendarSummary[]>({
    queryKey: calendarsQueryKey,
    queryFn: () => client.listCalendars(),
    enabled: isSignedIn,
    staleTime: 5 * 60 * 1000,
  })
}
