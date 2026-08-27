import type { Settings } from '@/types'

export const DEFAULT_SETTINGS: Settings = {
  selectedCalendars: [],
  defaultSearchRange: 'around-30',
  theme: 'system',
  palette: 'coral',
  birthdayKeywords: ['birthday', 'szülinap', 'születésnap'],
  cacheTtlHours: 24,
}
