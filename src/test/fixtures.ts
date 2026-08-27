import type { GiftRecord } from '@/types'

export const FIXTURE_BIRTHDAY_ID = 'birthday-john-2026'

export function createGiftRecord(overrides: Partial<GiftRecord> = {}): GiftRecord {
  return {
    birthdayId: FIXTURE_BIRTHDAY_ID,
    year: 2026,
    purchased: false,
    delivered: false,
    budget: null,
    actualCost: null,
    description: '',
    notes: '',
    ...overrides,
  }
}
