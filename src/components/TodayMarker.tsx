const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

/** Red rule showing where today sits between past and upcoming birthdays. */
export function TodayMarker({ today = new Date() }: { today?: Date }) {
  const label = `Today · ${dateFormatter.format(today)}`

  return (
    <div role="separator" aria-label={label} className="flex items-center gap-3 py-1">
      <span className="h-px flex-1 bg-today" />
      <span className="whitespace-nowrap text-xs font-medium text-today">{label}</span>
      <span className="h-px flex-1 bg-today" />
    </div>
  )
}
