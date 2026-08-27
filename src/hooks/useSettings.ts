import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsRepository } from '@/db'
import { DEFAULT_SETTINGS } from '@/models/defaults'
import type { Settings } from '@/types'

export const settingsQueryKey = ['settings'] as const

export function useSettings() {
  const query = useQuery<Settings>({
    queryKey: settingsQueryKey,
    queryFn: () => settingsRepository.get(),
    staleTime: Infinity,
  })

  return { ...query, settings: query.data ?? DEFAULT_SETTINGS }
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (partial: Partial<Settings>) => settingsRepository.update(partial),
    onSuccess: (settings) => queryClient.setQueryData(settingsQueryKey, settings),
  })
}
