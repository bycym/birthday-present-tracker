/**
 * Keyword matching for birthday titles.
 *
 * Matching is diacritic- and case-insensitive, and a keyword also matches when
 * a suffix has been glued onto it — Hungarian "születésnapja" matches the
 * keyword "születésnap", and "szulinap" typed without accents matches too.
 */

/** Strips accents so "Szülinap", "szulinap" and "SZÜLINAP" all compare equal. */
export function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
}

const SEPARATORS = /[\s\-–—:,;.·|/\\()[\]]+/u
const TRIM_PUNCTUATION = /^[\s\-–—:,;.·|/\\()[\]]+|[\s\-–—:,;.·|/\\()[\]]+$/gu
const POSSESSIVE = /['’]s$/i

export function normalizeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>()

  for (const keyword of keywords) {
    const folded = fold(keyword.trim())
    if (folded) seen.add(folded)
  }

  return [...seen]
}

/** Parses the comma-separated Settings field into a keyword list. */
export function parseKeywordInput(value: string): string[] {
  return value
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean)
}

export function formatKeywordInput(keywords: string[]): string {
  return keywords.join(', ')
}

function isKeywordToken(token: string, foldedKeywords: string[]): boolean {
  const folded = fold(token)
  return foldedKeywords.some((keyword) => folded.startsWith(keyword))
}

export interface KeywordMatch {
  /** What is left of the title once the keyword tokens are removed. */
  name: string
  matched: boolean
}

/**
 * Splits a title into words, drops the ones that are birthday keywords and
 * returns the rest as the person's name. Word order does not matter, so
 * "Birthday - John", "Anna szülinap" and "születésnapja Béla" all work.
 */
export function matchKeywords(title: string, keywords: string[]): KeywordMatch {
  const foldedKeywords = normalizeKeywords(keywords)
  const trimmed = title.trim()
  if (!trimmed || foldedKeywords.length === 0) return { name: '', matched: false }

  const tokens = trimmed.split(SEPARATORS).filter(Boolean)
  const remaining: string[] = []
  let matched = false

  for (const token of tokens) {
    if (isKeywordToken(token, foldedKeywords)) {
      matched = true
      continue
    }
    remaining.push(token)
  }

  if (!matched) return { name: '', matched: false }

  const name = remaining
    .join(' ')
    .replace(TRIM_PUNCTUATION, '')
    .replace(POSSESSIVE, '')
    .trim()

  // A title that is nothing but the keyword still marks a birthday; keep the
  // original text as the name rather than dropping the event silently.
  return { name: name || trimmed, matched: true }
}

/** True when any keyword appears in the text — used to spot birthday calendars. */
export function containsKeyword(text: string, keywords: string[]): boolean {
  const foldedText = fold(text)
  return normalizeKeywords(keywords).some((keyword) => foldedText.includes(keyword))
}
