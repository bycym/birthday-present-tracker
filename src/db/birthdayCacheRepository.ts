import type { Birthday } from '@/types'
import {
  CACHE_META_ID,
  db,
  type BirthdayCacheMeta,
  type BirthdayGiftTrackerDB,
} from './database'

export interface CachedBirthdays {
  meta: BirthdayCacheMeta
  birthdays: Birthday[]
}

export class BirthdayCacheRepository {
  private readonly database: BirthdayGiftTrackerDB

  constructor(database: BirthdayGiftTrackerDB = db) {
    this.database = database
  }

  async read(): Promise<CachedBirthdays | null> {
    const meta = await this.database.birthdayCacheMeta.get(CACHE_META_ID)
    if (!meta) return null

    const birthdays = await this.database.birthdays.orderBy('date').toArray()
    return { meta, birthdays }
  }

  /** Replaces the cache wholesale, so a stale row can never survive a write. */
  async write(
    meta: Omit<BirthdayCacheMeta, 'id'>,
    birthdays: Birthday[],
  ): Promise<CachedBirthdays> {
    const row: BirthdayCacheMeta = { id: CACHE_META_ID, ...meta }

    await this.database.transaction(
      'rw',
      this.database.birthdays,
      this.database.birthdayCacheMeta,
      async () => {
        await this.database.birthdays.clear()
        await this.database.birthdays.bulkPut(birthdays)
        await this.database.birthdayCacheMeta.put(row)
      },
    )

    return { meta: row, birthdays }
  }

  /**
   * Ages the cache out without deleting anything, so the next load goes to the
   * network but can still fall back to these rows if the network is down.
   * Deleting up front would leave an offline user with nothing to show.
   */
  async markStale(): Promise<void> {
    const meta = await this.database.birthdayCacheMeta.get(CACHE_META_ID)
    if (!meta) return
    await this.database.birthdayCacheMeta.put({ ...meta, fetchedAt: 0 })
  }

  /** Removes cached birthdays outright. Used on teardown and in tests. */
  async clear(): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.birthdays,
      this.database.birthdayCacheMeta,
      async () => {
        await this.database.birthdays.clear()
        await this.database.birthdayCacheMeta.clear()
      },
    )
  }
}

export const birthdayCacheRepository = new BirthdayCacheRepository()
