/** Number of palette colours available to tint a row. */
export const TINT_SLOTS = 4

/**
 * Picks one of the palette colours for a value, deterministically — the same
 * person always gets the same colour, across reloads and cache refreshes,
 * while the list as a whole stays varied.
 */
export function tintSlot(key: string): number {
  let hash = 0
  for (let index = 0; index < key.length; index += 1) {
    hash = (hash * 31 + key.charCodeAt(index)) | 0
  }
  return (Math.abs(hash) % TINT_SLOTS) + 1
}

/** First letter of a name, for the row avatar. */
export function initialOf(name: string): string {
  return [...name.trim()][0]?.toLocaleUpperCase() ?? '?'
}
