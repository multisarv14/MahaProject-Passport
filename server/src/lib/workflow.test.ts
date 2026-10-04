import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkTransition, CASE_READERS, TRANSITIONS } from './workflow.ts'

test('ward officer can assign a suspected case', () => {
  assert.deepEqual(checkTransition('assign', 'ward_officer', 'suspected'), { ok: true, to: 'assigned' })
})

test('inspector cannot approve a notice', () => {
  const r = checkTransition('approve', 'inspector', 'verified')
  assert.equal(r.ok, false)
  assert.equal(!r.ok && r.code, 'FORBIDDEN_ROLE')
})

test('a case cannot be approved before a site visit', () => {
  const r = checkTransition('approve', 'assessment_officer', 'assigned')
  assert.equal(!r.ok && r.code, 'INVALID_STATUS')
})

test('notice can only go out from a verified case', () => {
  for (const s of ['suspected', 'assigned', 'not_found', 'objection', 'recovered', 'closed'] as const) {
    assert.equal(checkTransition('approve', 'commissioner', s).ok, false, s)
  }
})

test('objection decision returns the case to notice_sent', () => {
  assert.deepEqual(checkTransition('decide_objection', 'hearing_officer', 'objection'), { ok: true, to: 'notice_sent' })
})

test('only a citizen files an objection', () => {
  assert.equal(checkTransition('file_objection', 'assessment_officer', 'notice_sent').ok, false)
  assert.equal(checkTransition('file_objection', 'citizen', 'notice_sent').ok, true)
})

test('representative cannot read individual case records', () => {
  assert.equal(CASE_READERS.includes('representative'), false)
})

test('platform admin cannot read case records or act on any case', () => {
  assert.equal(CASE_READERS.includes('platform_admin'), false)
  for (const t of Object.values(TRANSITIONS)) assert.equal(t.roles.includes('platform_admin'), false)
})
