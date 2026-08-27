import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BirthdayGiftTrackerDB, DB_VERSION, resetDatabase } from './database'

describe('BirthdayGiftTrackerDB schema', () => {
  let testDb: BirthdayGiftTrackerDB

  beforeEach(async () => {
    testDb = new BirthdayGiftTrackerDB(`schema-test-${crypto.randomUUID()}`)
    await testDb.open()
  })

  afterEach(async () => {
    await testDb.delete()
    testDb.close()
  })

  it('opens at the current version with every store', async () => {
    expect(testDb.verno).toBe(DB_VERSION)
    expect(testDb.tables.map((t) => t.name).sort()).toEqual([
      'birthdayCacheMeta',
      'birthdays',
      'gifts',
      'settings',
    ])
  })

  it('resetDatabase clears all records while keeping schema', async () => {
    await testDb.gifts.put({
      birthdayId: 'b1',
      year: 2026,
      purchased: true,
      delivered: false,
      budget: 100,
      actualCost: 90,
      description: 'Book',
      notes: '',
    })
    await testDb.settings.put({
      id: 'app-settings',
      selectedCalendars: ['cal-1'],
      defaultSearchRange: 'next-60',
      theme: 'dark',
      palette: 'coral',
      birthdayKeywords: ['birthday'],
      cacheTtlHours: 24,
    })

    await resetDatabase(testDb)

    expect(await testDb.gifts.count()).toBe(0)
    expect(await testDb.settings.count()).toBe(0)
    expect(testDb.verno).toBe(DB_VERSION)
  })
})
