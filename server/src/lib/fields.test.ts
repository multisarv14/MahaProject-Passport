import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coerceRow, suggestMapping } from './fields.ts'

test('recognises English and Marathi headers', () => {
  const m = suggestMapping('tax', ['मालमत्ता क्रमांक', 'Owner Name', 'पत्ता', 'Usage_Type', 'Assessed_Area'])
  assert.equal(m.taxNo, 'मालमत्ता क्रमांक')
  assert.equal(m.owner, 'Owner Name')
  assert.equal(m.address, 'पत्ता')
  assert.equal(m.usage, 'Usage_Type')
  assert.equal(m.assessedArea, 'Assessed_Area')
})

test('rejects impossible dates and accepts dd-mm-yyyy', () => {
  const map = { consumerNo: 'c', address: 'a', category: 't', since: 'd' }
  assert.equal(coerceRow('elec', { c: '1', a: 'x', t: 'LT-I', d: '31-31-2026' }, map).ok, false)
  assert.equal(coerceRow('elec', { c: '1', a: 'x', t: 'LT-I', d: '30-02-2026' }, map).ok, false)
  assert.equal(coerceRow('elec', { c: '1', a: 'x', t: 'LT-I', d: '05-03-2026' }, map).data?.since, '2026-03-05')
})

test('reads usage and tariff in either language', () => {
  const map = { taxNo: 'n', owner: 'o', address: 'a', usage: 'u', assessedArea: 'ar' }
  assert.equal(coerceRow('tax', { n: '1', o: 'x', a: 'y', u: 'व्यावसायिक', ar: '1,200' }, map).data?.usage, 'commercial')
  assert.equal(coerceRow('tax', { n: '1', o: 'x', a: 'y', u: 'Residential', ar: '900' }, map).data?.assessedArea, 900)
  const e = coerceRow('elec', { c: '1', a: 'x', t: 'LT-II Commercial' }, { consumerNo: 'c', address: 'a', category: 't' })
  assert.equal(e.data?.category, 'LT-II व्यावसायिक')
})
