const RELATIVE = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

/**
 * Math.round breaks ties towards +Infinity, so -1.5 becomes -1 and "90 minutes
 * ago" would read as "1 hour ago". Rounding the magnitude keeps past and future
 * symmetric.
 */
function roundMagnitude(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value))
}

/** "3 days ago" from a timestamp, picking the largest sensible unit. */
export function formatAge(fetchedAt: number, now = Date.now()): string {
  const minutes = roundMagnitude((fetchedAt - now) / 60_000)

  if (Math.abs(minutes) < 60) return RELATIVE.format(minutes, 'minute')

  const hours = roundMagnitude(minutes / 60)
  if (Math.abs(hours) < 24) return RELATIVE.format(hours, 'hour')

  return RELATIVE.format(roundMagnitude(hours / 24), 'day')
}
