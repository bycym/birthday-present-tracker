import Dexie, { type Table } from 'dexie'
import type { Birthday, GiftRecord, Settings } from '@/types'

export const DB_NAME = 'BirthdayGiftTracker'
export const DB_VERSION = 2
export const SETTINGS_ID = 'app-settings'
export const CACHE_META_ID = 'birthday-cache'

/**
 * Describes what the cached birthday rows cover, so a later read can decide
 * whether they still answer the question being asked.
 */
export interface BirthdayCacheMeta {
  id: typeof CACHE_META_ID
  fetchedAt: number
  /** Inclusive ISO dates spanned by the cached rows. */
  coverageStart: string
  coverageEnd: string
  /** Sorted, so comparison against the current selection is order-independent. */
  calendarIds: string[]
  keywords: string[]
}

export type GiftKey = [birthdayId: string, year: number]

export interface SettingsRow extends Settings {
  id: typeof SETTINGS_ID
}

export class BirthdayGiftTrackerDB extends Dexie {
  gifts!: Table<GiftRecord, GiftKey>
  settings!: Table<SettingsRow, string>
  birthdays!: Table<Birthday, string>
  birthdayCacheMeta!: Table<BirthdayCacheMeta, string>

  constructor(name = DB_NAME) {
    super(name)

    this.version(1).stores({
      gifts: '[birthdayId+year], birthdayId, year',
      settings: 'id',
    })

    // v2 adds the offline birthday cache. Existing gift and settings rows are
    // untouched: Dexie carries stores forward unless they are redefined.
    this.version(2).stores({
      birthdays: 'id, date, calendarId',
      birthdayCacheMeta: 'id',
    })
  }
}

export const db = new BirthdayGiftTrackerDB()

export async function resetDatabase(instance: BirthdayGiftTrackerDB = db): Promise<void> {
  await instance.delete()
  await instance.open()
}
