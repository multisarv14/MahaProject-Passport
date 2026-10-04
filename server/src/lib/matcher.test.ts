import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CandidateIndex, decide, prepare } from './matcher.ts'

const index = () => {
  const i = new CandidateIndex()
  i.add(prepare({ id: 'P1', ward: 1, address: 'घर क्र. 64, शाळा रस्ता, स्टेशन परिसर', owner: 'सुनील पाटील' }))
  i.add(prepare({ id: 'P2', ward: 1, address: 'घर क्र. 65, शाळा रस्ता, स्टेशन परिसर', owner: 'रेखा जोशी' }))
  i.add(prepare({ id: 'P3', ward: 3, address: 'घर क्र. 12, मंदिर गल्ली, गणेश नगर', owner: 'विजय माने' }))
  i.add(prepare({ id: 'P4', ward: 3, address: 'घर क्र. 12, मंदिर गल्ली, गणेश नगर', owner: 'अनिता माने' }))
  return i
}

test('English electricity record links to the Marathi tax property', () => {
  const d = decide({ address: 'H.No. 64, Shala Road, Station Area', name: 'Sunil Patil' }, index())
  assert.equal(d.kind, 'link')
  assert.equal(d.kind === 'link' && d.propertyId, 'P1')
})

test('neighbouring house number is not linked', () => {
  const d = decide({ address: 'H.No. 66, Shala Road, Station Area', name: 'Sunil Patil' }, index())
  assert.equal(d.kind, 'new')
})

test('two properties at the same address go to an officer, not a guess', () => {
  const d = decide({ address: '12 Mandir Lane, Ganesh Nagar' }, index())
  assert.equal(d.kind, 'review')
})

test('unknown address creates a new passport', () => {
  const d = decide({ address: 'Plot 9, Industrial Area, MIDC Road', name: 'Om Traders' }, index())
  assert.equal(d.kind, 'new')
})

test('wrong ward lowers the score below auto-link', () => {
  const d = decide({ address: 'H.No. 64, Shala Road, Station Area', name: 'Sunil Patil', ward: 7 }, index())
  assert.notEqual(d.kind, 'link')
})
