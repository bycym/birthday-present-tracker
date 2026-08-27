import { BirthdayGiftTrackerDB } from '@/db/database'
import { GiftRepository } from '@/db/giftRepository'
import { GiftService, emptyGiftRecord, yearOf } from './giftService'

let db: BirthdayGiftTrackerDB
let service: GiftService

beforeEach(async () => {
  db = new BirthdayGiftTrackerDB(`gift-test-${crypto.randomUUID()}`)
  await db.open()
  service = new GiftService(new GiftRepository(db))
})

afterEach(async () => {
  await db.delete()
})

describe('yearOf', () => {
  it('reads the year off an ISO date', () => {
    expect(yearOf('2026-03-15')).toBe(2026)
  })
})

describe('GiftService', () => {
  it('returns a blank unsaved record when nothing is stored', async () => {
    const record = await service.getOrCreate('b1', 2026)
    expect(record).toEqual(emptyGiftRecord('b1', 2026))
    expect(await service.getHistory('b1')).toEqual([])
  })

  it('persists gift details scoped to birthday and year', async () => {
    await service.update('b1', 2026, { description: 'LEGO', budget: 25000, actualCost: 22000 })
    await service.update('b1', 2025, { description: 'Wine' })

    expect(await service.getOrCreate('b1', 2026)).toMatchObject({
      description: 'LEGO',
      budget: 25000,
      actualCost: 22000,
    })
    expect(await service.getOrCreate('b1', 2025)).toMatchObject({ description: 'Wine' })
    expect(await service.getOrCreate('b2', 2026)).toMatchObject({ description: '' })
  })

  it('keeps purchased and delivered coherent', async () => {
    const delivered = await service.setDelivered('b1', 2026, true)
    expect(delivered).toMatchObject({ purchased: true, delivered: true })

    const unpurchased = await service.setPurchased('b1', 2026, false)
    expect(unpurchased).toMatchObject({ purchased: false, delivered: false })
  })

  it('lists history newest first and can exclude the current year', async () => {
    for (const [year, description] of [
      [2024, 'Book'],
      [2025, 'Wine'],
      [2026, 'Board Game'],
    ] as const) {
      await service.update('b1', year, { description })
    }

    expect((await service.getHistory('b1')).map((r) => r.year)).toEqual([2026, 2025, 2024])
    expect((await service.getHistory('b1', 2026)).map((r) => r.description)).toEqual([
      'Wine',
      'Book',
    ])
  })

  it('indexes a year of statuses by birthday id for the dashboard', async () => {
    await service.setPurchased('b1', 2026, true)
    await service.setPurchased('b2', 2025, true)

    const statuses = await service.getStatusesForYear(2026)
    expect([...statuses.keys()]).toEqual(['b1'])
    expect(statuses.get('b1')?.purchased).toBe(true)
  })
})
