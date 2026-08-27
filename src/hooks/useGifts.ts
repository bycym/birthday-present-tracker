import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { giftService } from '@/services/giftService'
import type { GiftRecord } from '@/types'

export const giftQueryKey = (birthdayId: string, year: number) =>
  ['gift', birthdayId, year] as const
export const giftHistoryQueryKey = (birthdayId: string) => ['gift-history', birthdayId] as const
export const giftYearQueryKey = (year: number) => ['gifts-by-year', year] as const

/** Gift status for every birthday in a year, for dashboard badges. */
export function useGiftStatuses(year: number) {
  const query = useQuery({
    queryKey: giftYearQueryKey(year),
    queryFn: () => giftService.getStatusesForYear(year),
  })

  return { ...query, statuses: query.data ?? new Map<string, GiftRecord>() }
}

export function useGift(birthdayId: string | undefined, year: number) {
  return useQuery({
    queryKey: giftQueryKey(birthdayId ?? '', year),
    queryFn: () => giftService.getOrCreate(birthdayId!, year),
    enabled: Boolean(birthdayId),
  })
}

export function useGiftHistory(birthdayId: string | undefined, excludeYear?: number) {
  return useQuery({
    queryKey: giftHistoryQueryKey(birthdayId ?? ''),
    queryFn: () => giftService.getHistory(birthdayId!, excludeYear),
    enabled: Boolean(birthdayId),
  })
}

export function useSaveGift(birthdayId: string, year: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (changes: Partial<Omit<GiftRecord, 'birthdayId' | 'year'>>) =>
      giftService.update(birthdayId, year, changes),
    onSuccess: (record) => {
      queryClient.setQueryData(giftQueryKey(birthdayId, year), record)
      queryClient.invalidateQueries({ queryKey: giftHistoryQueryKey(birthdayId) })
      queryClient.invalidateQueries({ queryKey: giftYearQueryKey(year) })
    },
  })
}
