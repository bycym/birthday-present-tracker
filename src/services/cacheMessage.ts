import type { BirthdaysSource } from '@/services/birthdayService'
import { formatAge } from '@/utils/formatAge'

/** One line describing where the shown data came from and how old it is. */
export function cacheMessage(
  source: BirthdaysSource,
  fetchedAt: number,
  online: boolean,
  now = Date.now(),
): string {
  const age = formatAge(fetchedAt, now)
  if (!online) return `Offline — showing saved data from ${age}`
  if (source === 'stale-cache') return `Could not reach Google — saved data from ${age}`
  if (source === 'cache') return `Saved data from ${age}`
  return `Updated ${age}`
}
