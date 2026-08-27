import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isOnline } from '@/services/birthdayCache'

/**
 * Tracks connectivity and refetches birthdays the moment it returns, so an
 * offline session heals itself without the user pressing anything.
 */
export function useOnlineStatus(): boolean {
  const queryClient = useQueryClient()
  const [online, setOnline] = useState(isOnline)

  useEffect(() => {
    const goOnline = () => {
      setOnline(true)
      queryClient.invalidateQueries({ queryKey: ['birthdays'] })
      queryClient.invalidateQueries({ queryKey: ['calendars'] })
    }
    const goOffline = () => setOnline(false)

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [queryClient])

  return online
}
