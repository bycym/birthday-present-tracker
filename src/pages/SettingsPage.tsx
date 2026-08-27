import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { useCalendars } from '@/hooks/useCalendars'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useRefreshBirthdays } from '@/hooks/useRefreshBirthdays'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { DEFAULT_SETTINGS } from '@/models/defaults'
import { cn } from '@/utils/cn'
import { formatKeywordInput, parseKeywordInput } from '@/providers'
import { RANGE_PRESETS, isRangePreset } from '@/services/dateRange'
import type { Palette, Settings } from '@/types'

const PALETTES: { id: Palette; label: string; swatches: string[] }[] = [
  { id: 'coral', label: 'Coral', swatches: ['#F38181', '#FCE38A', '#EAFFD0', '#95E1D3'] },
  { id: 'citrus', label: 'Citrus', swatches: ['#70FFD2', '#FFFC8C', '#FFCC4D', '#FF9137'] },
  { id: 'pastel', label: 'Pastel', swatches: ['#A8D8EA', '#AA96DA', '#FCBAD3', '#FFFFD2'] },
]

const CACHE_TTL_OPTIONS = [
  { hours: 1, label: '1 hour' },
  { hours: 6, label: '6 hours' },
  { hours: 24, label: '1 day' },
  { hours: 72, label: '3 days' },
  { hours: 168, label: '1 week' },
  { hours: 336, label: '2 weeks' },
]

export function SettingsPage() {
  const { settings } = useSettings()
  const updateSettings = useUpdateSettings()
  const calendarsQuery = useCalendars()
  const calendars = calendarsQuery.data ?? []
  const refresh = useRefreshBirthdays()
  const online = useOnlineStatus()
  const [keywordInput, setKeywordInput] = useState(() =>
    formatKeywordInput(settings.birthdayKeywords),
  )

  // Re-seed once the stored settings arrive from IndexedDB.
  useEffect(() => {
    setKeywordInput(formatKeywordInput(settings.birthdayKeywords))
  }, [settings.birthdayKeywords])

  const saveKeywords = (value: string) => {
    const keywords = parseKeywordInput(value)
    updateSettings.mutate({
      birthdayKeywords: keywords.length
        ? keywords
        : [...DEFAULT_SETTINGS.birthdayKeywords],
    })
  }

  const toggleCalendar = (calendarId: string, checked: boolean) => {
    const selected = checked
      ? [...settings.selectedCalendars, calendarId]
      : settings.selectedCalendars.filter((id) => id !== calendarId)
    updateSettings.mutate({ selectedCalendars: [...new Set(selected)] })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>
            Calendar selection and preferences, stored locally in IndexedDB.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calendars</CardTitle>
          <CardDescription>Pick the calendars to read birthdays from.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {calendarsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading calendars…</p>
          ) : calendarsQuery.error ? (
            <p role="alert" className="text-sm text-muted-foreground">
              {calendarsQuery.error instanceof Error
                ? calendarsQuery.error.message
                : 'Could not load calendars.'}
            </p>
          ) : calendars.length === 0 ? (
            <p className="text-sm text-muted-foreground">No calendars found on this account.</p>
          ) : (
            calendars.map((calendar) => (
              <label
                key={calendar.id}
                className="flex items-center gap-3 rounded-md border border-border px-4 py-3 text-sm"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--color-primary)]"
                  checked={settings.selectedCalendars.includes(calendar.id)}
                  onChange={(event) => toggleCalendar(calendar.id, event.target.checked)}
                />
                <span className="min-w-0 flex-1 truncate">{calendar.name}</span>
                {calendar.primary && (
                  <span className="text-xs text-muted-foreground">Primary</span>
                )}
              </label>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Birthday keywords</CardTitle>
          <CardDescription>
            Comma-separated words that mark an ordinary calendar event as a birthday. Matching
            ignores case, accents and word order, and also catches suffixed forms such as
            &ldquo;születésnapja&rdquo;. A calendar whose own name contains one of these words is
            treated as a birthday calendar, so every event on it counts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="keywords">Keywords</Label>
            <Input
              id="keywords"
              value={keywordInput}
              placeholder={formatKeywordInput(DEFAULT_SETTINGS.birthdayKeywords)}
              onChange={(event) => setKeywordInput(event.target.value)}
              onBlur={(event) => saveKeywords(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur()
              }}
            />
            <p className="text-xs text-muted-foreground">
              Cake and party emoji (🎂 🎉 🥳 🎁) always count, whatever the keywords are.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setKeywordInput(formatKeywordInput(DEFAULT_SETTINGS.birthdayKeywords))
              updateSettings.mutate({
                birthdayKeywords: [...DEFAULT_SETTINGS.birthdayKeywords],
              })
            }}
          >
            Reset to defaults
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Colour palette</CardTitle>
          <CardDescription>Applies to both light and dark mode.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {PALETTES.map((option) => {
            const selected = settings.palette === option.id
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => updateSettings.mutate({ palette: option.id })}
                className={cn(
                  'lift rounded-md border-2 bg-card p-3 text-left shadow-card',
                  selected ? 'border-primary' : 'border-border',
                )}
              >
                <span className="flex gap-1">
                  {option.swatches.map((colour) => (
                    <span
                      key={colour}
                      aria-hidden
                      className="h-6 flex-1 rounded-sm"
                      style={{ backgroundColor: colour }}
                    />
                  ))}
                </span>
                <span className="mt-2 block text-sm font-medium">{option.label}</span>
              </button>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Offline cache</CardTitle>
          <CardDescription>
            Birthdays are stored in this browser so the app opens instantly and works offline.
            Google is only asked again once the saved copy is older than the lifetime below.
            Refreshing keeps the saved copy until a new one arrives, so it stays safe offline.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cacheTtl">Cache lifetime</Label>
            <Select
              id="cacheTtl"
              value={String(settings.cacheTtlHours)}
              onChange={(event) =>
                updateSettings.mutate({ cacheTtlHours: Number(event.target.value) })
              }
            >
              {CACHE_TTL_OPTIONS.map((option) => (
                <option key={option.hours} value={option.hours}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending || !online}
              title={online ? undefined : 'Unavailable while offline'}
            >
              {refresh.isPending ? 'Refreshing…' : 'Refresh from Google now'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="defaultRange">Default search range</Label>
            <Select
              id="defaultRange"
              value={settings.defaultSearchRange}
              onChange={(event) => {
                const value = event.target.value
                updateSettings.mutate({
                  defaultSearchRange: isRangePreset(value) ? value : 'custom',
                })
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
            <Label htmlFor="theme">Theme</Label>
            <Select
              id="theme"
              value={settings.theme}
              onChange={(event) =>
                updateSettings.mutate({ theme: event.target.value as Settings['theme'] })
              }
            >
              <option value="system">Follow system</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
