import { Link, useParams } from 'react-router-dom'
import { GiftForm } from '@/components/GiftForm'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useBirthday } from '@/hooks/useBirthday'
import { useGift, useGiftHistory } from '@/hooks/useGifts'
import { daysUntil, formatDaysRemaining, parseIsoDate } from '@/services/dateRange'
import { yearOf } from '@/services/giftService'

const SOURCE_LABELS: Record<string, string> = {
  'google-birthdays': 'Google Birthdays calendar',
  calendar: 'Dedicated birthday calendar',
  event: 'Calendar event title',
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const currencyFormatter = new Intl.NumberFormat()

export function BirthdayDetailsPage() {
  const { id: rawId } = useParams<{ id: string }>()
  const id = rawId ? decodeURIComponent(rawId) : undefined
  const { birthday, isLoading, error } = useBirthday(id)

  const year = birthday ? yearOf(birthday.date) : new Date().getFullYear()
  const giftQuery = useGift(id, year)
  const historyQuery = useGiftHistory(id, year)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading birthday…</p>
  }

  if (error || !birthday) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Birthday not found</CardTitle>
          <CardDescription>
            {error instanceof Error
              ? error.message
              : 'This birthday is not in your selected calendars or upcoming year.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/" className="text-sm text-primary hover:underline">
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    )
  }

  const history = historyQuery.data ?? []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{birthday.name}</CardTitle>
          <CardDescription>
            {dateFormatter.format(parseIsoDate(birthday.date))} ·{' '}
            {formatDaysRemaining(daysUntil(birthday.date))}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="outline">{birthday.calendarName}</Badge>
          <Badge variant="muted">{SOURCE_LABELS[birthday.source] ?? birthday.source}</Badge>
          {birthday.recurring && <Badge variant="muted">Recurring</Badge>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gift for {year}</CardTitle>
          <CardDescription>Stored locally in your browser only.</CardDescription>
        </CardHeader>
        <CardContent>
          {giftQuery.data ? (
            <GiftForm record={giftQuery.data} />
          ) : (
            <p className="text-sm text-muted-foreground">Loading gift details…</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gift history</CardTitle>
          <CardDescription>Previous years, newest first.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No gifts recorded for earlier years.</p>
          ) : (
            history.map((record) => (
              <div
                key={record.year}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {record.year} · {record.description || 'No gift recorded'}
                  </p>
                  {record.notes && (
                    <p className="truncate text-xs text-muted-foreground">{record.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {record.actualCost !== null && (
                    <Badge variant="outline">{currencyFormatter.format(record.actualCost)}</Badge>
                  )}
                  <Badge variant={record.delivered ? 'success' : 'muted'}>
                    {record.delivered ? 'Delivered' : record.purchased ? 'Purchased' : 'Planned'}
                  </Badge>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
