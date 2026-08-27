import { useMemo } from 'react'
import { GoogleCalendarClient } from '@/api/googleCalendar'
import { useAuth } from '@/contexts/auth-context'

/** A Calendar client bound to the in-memory token, refreshed transparently. */
export function useCalendarClient(): GoogleCalendarClient {
  const { getAccessToken } = useAuth()
  return useMemo(() => new GoogleCalendarClient(getAccessToken), [getAccessToken])
}
