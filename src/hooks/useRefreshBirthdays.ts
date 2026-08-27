import { useMutation, useQueryClient } from '@tanstack/react-query'
import { birthdayCacheRepository } from '@/db'

/**
 * Forces the next load to ask Google, by ageing the cache out rather than
 * deleting it. If the request then fails — typically because the device is
 * offline — the saved rows are still there to fall back on.
 */
export function useRefreshBirthdays() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => birthdayCacheRepository.markStale(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['birthdays'] }),
  })
}
