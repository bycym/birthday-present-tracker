import type { Palette, Settings, SearchRangePreset } from '@/types'
import { DEFAULT_SETTINGS } from '@/models/defaults'
import { isRangePreset } from '@/services/dateRange'

/** Values written before search ranges became named ids. */
const LEGACY_RANGES: Record<string, SearchRangePreset> = {
  '30': 'next-30',
  '60': 'next-60',
  '90': 'next-90',
  '-30': 'past-30',
  '-60': 'past-60',
  '-90': 'past-90',
}

const PALETTES: Palette[] = ['coral', 'citrus', 'pastel']

function migratePalette(value: unknown): Palette {
  return PALETTES.includes(value as Palette) ? (value as Palette) : DEFAULT_SETTINGS.palette
}

function migrateSearchRange(value: unknown): Settings['defaultSearchRange'] {
  if (value === 'custom' || isRangePreset(value)) return value
  return LEGACY_RANGES[String(value)] ?? DEFAULT_SETTINGS.defaultSearchRange
}
import { db, SETTINGS_ID, type BirthdayGiftTrackerDB, type SettingsRow } from './database'

export class SettingsRepository {
  private readonly database: BirthdayGiftTrackerDB

  constructor(database: BirthdayGiftTrackerDB = db) {
    this.database = database
  }

  async get(): Promise<Settings> {
    // Rows written by older versions may predate a field, so treat them as partial.
    const row = (await this.database.settings.get(SETTINGS_ID)) as
      | (Partial<Settings> & { id: string })
      | undefined
    if (!row) return { ...DEFAULT_SETTINGS }
    // Drop the storage-only primary key so callers get a clean Settings object.
    const {
      selectedCalendars,
      defaultSearchRange,
      theme,
      palette,
      birthdayKeywords,
      cacheTtlHours,
    } = row
    return {
      selectedCalendars: selectedCalendars ?? [...DEFAULT_SETTINGS.selectedCalendars],
      defaultSearchRange: migrateSearchRange(defaultSearchRange),
      theme: theme ?? DEFAULT_SETTINGS.theme,
      palette: migratePalette(palette),
      // Backfill for rows written before keywords were configurable.
      birthdayKeywords: birthdayKeywords?.length
        ? birthdayKeywords
        : [...DEFAULT_SETTINGS.birthdayKeywords],
      cacheTtlHours:
        typeof cacheTtlHours === 'number' && cacheTtlHours > 0
          ? cacheTtlHours
          : DEFAULT_SETTINGS.cacheTtlHours,
    }
  }

  async save(settings: Settings): Promise<Settings> {
    const row: SettingsRow = { id: SETTINGS_ID, ...settings }
    await this.database.settings.put(row)
    return settings
  }

  async update(partial: Partial<Settings>): Promise<Settings> {
    const current = await this.get()
    return this.save({ ...current, ...partial })
  }

  async reset(): Promise<Settings> {
    return this.save({ ...DEFAULT_SETTINGS })
  }
}

export const settingsRepository = new SettingsRepository()
