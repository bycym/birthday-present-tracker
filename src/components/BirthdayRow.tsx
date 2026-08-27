import { Link } from 'react-router-dom'
import { Gift, PackageCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { daysUntil, formatDaysRemaining, parseIsoDate } from '@/services/dateRange'
import type { Birthday, GiftRecord } from '@/types'
import { cn } from '@/utils/cn'
import { initialOf, tintSlot } from '@/utils/tintSlot'

const dateFormatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })

/** Closer birthdays get a louder badge, so urgency reads at a glance. */
function remainingVariant(days: number) {
  if (days < 0) return 'muted' as const
  if (days <= 7) return 'default' as const
  if (days <= 30) return 'accent' as const
  return 'outline' as const
}

export function BirthdayRow({ birthday, gift }: { birthday: Birthday; gift?: GiftRecord }) {
  const remaining = daysUntil(birthday.date)

  return (
    <Link
      to={`/birthday/${encodeURIComponent(birthday.id)}`}
      // Hand the row's data along so the details page need not refetch.
      state={{ birthday }}
      className={cn(
        'lift birthday-row flex flex-wrap items-center justify-between gap-3',
        'rounded-md border border-border bg-card py-3 pl-3 pr-4 shadow-card',
        `row-tint-${tintSlot(birthday.id)}`,
        remaining < 0 && 'opacity-75',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className="birthday-avatar grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold shadow-inset"
        >
          {initialOf(birthday.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{birthday.name}</p>
          <p className="text-xs text-muted-foreground">
            {dateFormatter.format(parseIsoDate(birthday.date))} · {birthday.calendarName}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={remainingVariant(remaining)}>{formatDaysRemaining(remaining)}</Badge>
        <Badge variant={gift?.purchased ? 'accent' : 'muted'}>
          <Gift aria-hidden className="size-3" />
          {gift?.purchased ? 'Purchased' : 'No gift'}
        </Badge>
        <Badge variant={gift?.delivered ? 'success' : 'muted'}>
          <PackageCheck aria-hidden className="size-3" />
          {gift?.delivered ? 'Delivered' : 'Not delivered'}
        </Badge>
      </div>
    </Link>
  )
}
