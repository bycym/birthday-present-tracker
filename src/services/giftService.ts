import { giftRepository, type GiftRepository } from '@/db'
import type { GiftRecord } from '@/types'

export function currentYear(today = new Date()): number {
  return today.getFullYear()
}

/** The year a birthday occurrence belongs to, taken from its ISO date. */
export function yearOf(isoDate: string): number {
  return Number(isoDate.slice(0, 4))
}

export function emptyGiftRecord(birthdayId: string, year: number): GiftRecord {
  return {
    birthdayId,
    year,
    purchased: false,
    delivered: false,
    budget: null,
    actualCost: null,
    description: '',
    notes: '',
  }
}

/**
 * Gift tracking is scoped to (birthdayId, year) so each year keeps its own
 * record and prior years become the history list.
 */
export class GiftService {
  private readonly repository: GiftRepository

  constructor(repository: GiftRepository = giftRepository) {
    this.repository = repository
  }

  /** Returns the stored record, or a blank unsaved one so forms always have a value. */
  async getOrCreate(birthdayId: string, year: number): Promise<GiftRecord> {
    const existing = await this.repository.getByBirthdayAndYear(birthdayId, year)
    return existing ?? emptyGiftRecord(birthdayId, year)
  }

  async save(record: GiftRecord): Promise<GiftRecord> {
    return this.repository.upsert(record)
  }

  async update(
    birthdayId: string,
    year: number,
    changes: Partial<Omit<GiftRecord, 'birthdayId' | 'year'>>,
  ): Promise<GiftRecord> {
    const current = await this.getOrCreate(birthdayId, year)
    const next: GiftRecord = { ...current, ...changes }
    // Delivering a gift implies it was purchased; keep the two flags coherent.
    if (next.delivered) next.purchased = true
    return this.repository.upsert(next)
  }

  async setPurchased(birthdayId: string, year: number, purchased: boolean): Promise<GiftRecord> {
    return this.update(birthdayId, year, purchased ? { purchased } : { purchased, delivered: false })
  }

  async setDelivered(birthdayId: string, year: number, delivered: boolean): Promise<GiftRecord> {
    return this.update(birthdayId, year, { delivered })
  }

  /** Previous years, newest first. */
  async getHistory(birthdayId: string, excludeYear?: number): Promise<GiftRecord[]> {
    const records = await this.repository.getHistory(birthdayId)
    return excludeYear === undefined
      ? records
      : records.filter((record) => record.year !== excludeYear)
  }

  async getStatusesForYear(year: number): Promise<Map<string, GiftRecord>> {
    const records = await this.repository.getByYear(year)
    return new Map(records.map((record) => [record.birthdayId, record]))
  }
}

export const giftService = new GiftService()
