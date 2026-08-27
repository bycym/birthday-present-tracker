import {
  containsKeyword,
  fold,
  formatKeywordInput,
  matchKeywords,
  normalizeKeywords,
  parseKeywordInput,
} from './keywords'

const KEYWORDS = ['birthday', 'szülinap', 'születésnap']

describe('fold', () => {
  it('strips accents and case', () => {
    expect(fold('SZÜLINAP')).toBe('szulinap')
    expect(fold('Születésnap')).toBe('szuletesnap')
  })
})

describe('normalizeKeywords', () => {
  it('folds, trims and dedupes', () => {
    expect(normalizeKeywords([' Birthday ', 'BIRTHDAY', 'szülinap', ''])).toEqual([
      'birthday',
      'szulinap',
    ])
  })
})

describe('parseKeywordInput / formatKeywordInput', () => {
  it('round-trips a comma-separated list', () => {
    expect(parseKeywordInput('birthday, szülinap ,, születésnap ')).toEqual(KEYWORDS)
    expect(formatKeywordInput(KEYWORDS)).toBe('birthday, szülinap, születésnap')
  })
})

describe('matchKeywords', () => {
  it('removes the keyword whatever its position', () => {
    expect(matchKeywords('Birthday - John', KEYWORDS)).toEqual({ name: 'John', matched: true })
    expect(matchKeywords('Anna szülinap', KEYWORDS)).toEqual({ name: 'Anna', matched: true })
    expect(matchKeywords('születésnap Béla', KEYWORDS)).toEqual({ name: 'Béla', matched: true })
  })

  it('matches suffixed Hungarian forms', () => {
    expect(matchKeywords('Anna születésnapja', KEYWORDS).name).toBe('Anna')
    expect(matchKeywords('Anna szülinapom', KEYWORDS).name).toBe('Anna')
  })

  it('drops the English possessive left behind', () => {
    expect(matchKeywords("Peter's birthday", KEYWORDS).name).toBe('Peter')
  })

  it('reports no match for unrelated titles', () => {
    expect(matchKeywords('Team standup', KEYWORDS)).toEqual({ name: '', matched: false })
  })

  it('reports no match when the keyword list is empty', () => {
    expect(matchKeywords('Anna szülinap', [])).toEqual({ name: '', matched: false })
  })

  it('keeps the original title when only the keyword is present', () => {
    expect(matchKeywords('Szülinap', KEYWORDS)).toEqual({ name: 'Szülinap', matched: true })
  })
})

describe('containsKeyword', () => {
  it('spots a keyword anywhere in a calendar name', () => {
    expect(containsKeyword('Birthday Calendar', KEYWORDS)).toBe(true)
    expect(containsKeyword('Szülinapok', KEYWORDS)).toBe(true)
    expect(containsKeyword('Family', KEYWORDS)).toBe(false)
  })
})
