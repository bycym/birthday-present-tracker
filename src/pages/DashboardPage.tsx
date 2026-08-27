import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BirthdayRow } from '@/components/BirthdayRow'
import { CacheStatus } from '@/components/CacheStatus'
import { TodayMarker } from '@/components/TodayMarker'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useBirthdays } from '@/hooks/useBirthdays'
import { useGiftStatuses } from '@/hooks/useGifts'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useRefreshBirthdays } from '@/hooks/useRefreshBirthdays'
import { useSettings } from '@/hooks/useSettings'
import { filterBirthdays, todayMarkerIndex } from '@/services/birthdayService'
import {
  RANGE_PRESETS,
  isRangePreset,
  isoDaysFromToday,
  type RangePreset,
  type SearchRange,
} from '@/services/dateRange'
import { currentYear } from '@/services/giftService'

export function DashboardPage() {
  const { settings, isLoading: settingsLoading } = useSettings()
  const [rangeChoice, setRangeChoice] = useState<RangePreset | 'custom' | null>(null)
  // Custom mode starts at today but the date inputs accept any past date.
  const [customStart, setCustomStart] = useState(() => isoDaysFromToday(-30))
  const [customEnd, setCustomEnd] = useState(() => isoDaysFromToday(30))
  const [search, setSearch] = useState('')
  const [calendarFilter, setCalendarFilter] = useState('all')

  // Falls back to the stored default until the user overrides it in this session.
  const effectiveChoice = rangeChoice ?? settings.defaultSearchRange

  const range = useMemo<SearchRange>(
    () =>
      effectiveChoice === 'custom'
        ? { kind: 'custom', start: customStart, end: customEnd }
        : { kind: 'preset', preset: effectiveChoice },
    [effectiveChoice, customStart, customEnd],
  )

  const {
    birthdays,
    isLoadingBirthdays,
    error,
    calendars,
    isLoadingCalendars,
    calendarsError,
    source,
    fetchedAt,
  } = useBirthdays({
    selectedCalendarIds: settings.selectedCalendars,
    range,
    keywords: settings.birthdayKeywords,
    ttlHours: settings.cacheTtlHours,
  })

  const refresh = useRefreshBirthdays()
  const online = useOnlineStatus()
  const { statuses } = useGiftStatuses(currentYear())

  const visible = useMemo(
    () => filterBirthdays(birthdays, { search, calendarId: calendarFilter }),
    [birthdays, search, calendarFilter],
  )

  const markerIndex = useMemo(() => todayMarkerIndex(visible), [visible])

  const noCalendarsSelected = !settingsLoading && settings.selectedCalendars.length === 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Birthdays</CardTitle>
          <CardDescription>
            Birthdays from your selected calendars, with this year&apos;s gift status.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="range">Date range</Label>
              <Select
                id="range"
                value={effectiveChoice}
                onChange={(event) => {
                  const value = event.target.value
                  setRangeChoice(isRangePreset(value) ? value : 'custom')
                }}
              >
                {RANGE_PRESETS.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
                <option value="custom">Custom range</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="calendar">Calendar</Label>
              <Select
                id="calendar"
                value={calendarFilter}
                onChange={(event) => setCalendarFilter(event.target.value)}
                disabled={isLoadingCalendars}
              >
                <option value="all">All calendars</option>
                {calendars
                  .filter((calendar) => settings.selectedCalendars.includes(calendar.id))
                  .map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.name}
                    </option>
                  ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                type="search"
                placeholder="Filter by name"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {effectiveChoice === 'custom' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="from">From</Label>
                <Input
                  id="from"
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 pt-6">
          <CacheStatus
            source={source}
            fetchedAt={fetchedAt}
            isRefreshing={refresh.isPending || isLoadingBirthdays}
            isOnline={online}
            onRefresh={() => refresh.mutate()}
          />
          {noCalendarsSelected ? (
            <p className="text-sm text-muted-foreground">
              No calendars selected yet.{' '}
              <Link to="/settings" className="text-primary hover:underline">
                Choose calendars in Settings
              </Link>
              .
            </p>
          ) : (error ?? calendarsError) ? (
            <p role="alert" className="text-sm text-muted-foreground">
              {(error ?? calendarsError) instanceof Error
                ? (error ?? calendarsError)!.message
                : 'Could not load birthdays.'}
            </p>
          ) : isLoadingBirthdays ? (
            <p className="text-sm text-muted-foreground">Loading birthdays…</p>
          ) : visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No birthdays found in this range.
            </p>
          ) : (
            visible.map((birthday, index) => (
              <Fragment key={birthday.id}>
                {index === markerIndex && <TodayMarker />}
                <BirthdayRow birthday={birthday} gift={statuses.get(birthday.id)} />
              </Fragment>
            ))
          )}
          {visible.length > 0 && markerIndex === visible.length && <TodayMarker />}
        </CardContent>
      </Card>
    </div>
  )
}
