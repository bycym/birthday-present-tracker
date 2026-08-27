import { BirthdayGiftTrackerDB, SETTINGS_ID } from './database'
import { SettingsRepository } from './settingsRepository'
import { DEFAULT_SETTINGS } from '@/models/defaults'

let db: BirthdayGiftTrackerDB
let repository: SettingsRepository

beforeEach(async () => {
  db = new BirthdayGiftTrackerDB(`settings-test-${crypto.randomUUID()}`)
  await db.open()
  repository = new SettingsRepository(db)
})

afterEach(async () => {
  await db.delete()
})

describe('SettingsRepository', () => {
  it('returns defaults when nothing is stored', async () => {
    expect(await repository.get()).toEqual(DEFAULT_SETTINGS)
  })

  it('round-trips edited settings', async () => {
    await repository.update({ birthdayKeywords: ['geburtstag'], theme: 'dark' })
    const settings = await repository.get()
    expect(settings.birthdayKeywords).toEqual(['geburtstag'])
    expect(settings.theme).toBe('dark')
  })

  it('backfills keywords for rows written before the field existed', async () => {
    // Simulates a settings row saved by an earlier version of the app.
    await db.settings.put({
      id: SETTINGS_ID,
      selectedCalendars: ['cal-1'],
      defaultSearchRange: 60,
      theme: 'light',
    } as never)

    const settings = await repository.get()
    expect(settings.selectedCalendars).toEqual(['cal-1'])
    expect(settings.birthdayKeywords).toEqual(DEFAULT_SETTINGS.birthdayKeywords)
    // The numeric 60 predates named presets and must map onto one.
    expect(settings.defaultSearchRange).toBe('next-60')
  })

  it('migrates every legacy numeric search range', async () => {
    for (const [legacy, expected] of [
      [30, 'next-30'],
      [60, 'next-60'],
      [90, 'next-90'],
      [-30, 'past-30'],
    ] as const) {
      await db.settings.put({
        id: SETTINGS_ID,
        selectedCalendars: [],
        defaultSearchRange: legacy,
        theme: 'system',
      } as never)
      expect((await repository.get()).defaultSearchRange).toBe(expected)
    }
  })

  it('falls back to the default for an unrecognised stored range', async () => {
    await db.settings.put({
      id: SETTINGS_ID,
      selectedCalendars: [],
      defaultSearchRange: 'nonsense',
      theme: 'system',
    } as never)
    expect((await repository.get()).defaultSearchRange).toBe('around-30')
  })

  it('defaults the palette when it is missing or unrecognised', async () => {
    await db.settings.put({
      id: SETTINGS_ID,
      selectedCalendars: [],
      defaultSearchRange: 'around-30',
      theme: 'system',
      palette: 'neon',
    } as never)
    expect((await repository.get()).palette).toBe('coral')
  })

  it('keeps a recognised palette', async () => {
    await repository.update({ palette: 'pastel' })
    expect((await repository.get()).palette).toBe('pastel')
  })

  it('defaults the cache TTL when it is missing or nonsensical', async () => {
    await db.settings.put({
      id: SETTINGS_ID,
      selectedCalendars: [],
      defaultSearchRange: 'around-30',
      theme: 'system',
      cacheTtlHours: -5,
    } as never)
    expect((await repository.get()).cacheTtlHours).toBe(24)
  })

  it('falls back to defaults when a stored keyword list is empty', async () => {
    await repository.save({ ...DEFAULT_SETTINGS, birthdayKeywords: [] })
    expect((await repository.get()).birthdayKeywords).toEqual(DEFAULT_SETTINGS.birthdayKeywords)
  })
})
