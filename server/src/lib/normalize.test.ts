import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeAddress, normalizeName, tokenSetSimilarity, transliterate } from './normalize.ts'

test('transliterates Marathi with word-final schwa dropped', () => {
  assert.equal(transliterate('शाळा रस्ता'), 'shala rasta')
  assert.equal(transliterate('स्टेशन परिसर'), 'steshan parisar')
  assert.equal(transliterate('घर क्र. ६४'), 'ghar kr. 64')
})

test('Marathi and English versions of one address are similar', () => {
  const a = normalizeAddress('घर क्र. 64, शाळा रस्ता, स्टेशन परिसर')
  const b = normalizeAddress('H.No. 64, Shala Road, Station Area')
  assert.equal(a.houseNo, '64')
  assert.equal(b.houseNo, '64')
  assert.ok(tokenSetSimilarity(a.tokens, b.tokens) >= 0.9, `got ${tokenSetSimilarity(a.tokens, b.tokens)}`)
})

test('synonyms line up: वसाहत = colony, मुख्य = main', () => {
  const a = normalizeAddress('घर क्र. 12, मुख्य रस्ता, नवीन वसाहत')
  const b = normalizeAddress('12 Main Rd, New Colony')
  assert.ok(tokenSetSimilarity(a.tokens, b.tokens) >= 0.9)
})

test('different locality is not similar', () => {
  const a = normalizeAddress('घर क्र. 12, मुख्य रस्ता, नवीन वसाहत')
  const b = normalizeAddress('घर क्र. 12, मंदिर गल्ली, विद्यानगर')
  assert.ok(tokenSetSimilarity(a.tokens, b.tokens) < 0.5)
})

test('names match across scripts', () => {
  assert.ok(tokenSetSimilarity(normalizeName('सुनील पाटील'), normalizeName('Sunil Patil')) >= 0.9)
  assert.ok(tokenSetSimilarity(normalizeName('सुनील पाटील'), normalizeName('Rekha Joshi')) < 0.5)
})
