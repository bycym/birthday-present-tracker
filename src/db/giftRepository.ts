import type { GiftRecord } from '@/types'
import { db, type BirthdayGiftTrackerDB } from './database'

export class GiftRepository {
  private readonly database: BirthdayGiftTrackerDB

  constructor(database: BirthdayGiftTrackerDB = db) {
    this.database = database
  }

  async getByBirthdayAndYear(birthdayId: string, year: number): Promise<GiftRecord | undefined> {
    return this.database.gifts.get([birthdayId, year])
  }

  async getByBirthdayId(birthdayId: string): Promise<GiftRecord[]> {
    return this.database.gifts.where('birthdayId').equals(birthdayId).sortBy('year')
  }

  async getHistory(birthdayId: string): Promise<GiftRecord[]> {
    const records = await this.getByBirthdayId(birthdayId)
    return records.sort((a, b) => b.year - a.year)
  }

  async getByYear(year: number): Promise<GiftRecord[]> {
    return this.database.gifts.where('year').equals(year).toArray()
  }

  async upsert(record: GiftRecord): Promise<GiftRecord> {
    await this.database.gifts.put(record)
    return record
  }

  async delete(birthdayId: string, year: number): Promise<void> {
    await this.database.gifts.delete([birthdayId, year])
  }

  async getAll(): Promise<GiftRecord[]> {
    return this.database.gifts.toArray()
  }
}

export const giftRepository = new GiftRepository()
