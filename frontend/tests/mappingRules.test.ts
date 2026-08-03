import assert from 'node:assert/strict'
import test from 'node:test'
import { computeAfter, type Col, validateMapping } from '../src/lib/mappingRules.ts'

const directColumn: Col = {
  key: 'test-column',
  json_field: 'promo_code',
  mnt_column: 'PROMO_CODE',
  rule_type: 'DIRECT',
  rule_value: null,
  required: false,
  locked: false,
}

const ruleTypes = ['DIRECT', 'DEFAULT', 'VALUE_MAP', 'SPLIT']

test('validateMapping rejects an unmapped target before bulk replace', () => {
  const error = validateMapping([{ ...directColumn, json_field: '' }], ruleTypes)
  assert.equal(error, 'Map PROMO_CODE to a source field before saving')
})

test('preview treats a target-only draft as incomplete', () => {
  const result = computeAfter({ promo_code: 'STORE_123' }, [{
    ...directColumn,
    json_field: '',
    mnt_column: 'STATUS',
  }])
  assert.equal(result, null)
})

test('validateMapping treats target names as case-insensitive', () => {
  const error = validateMapping([
    directColumn,
    { ...directColumn, key: 'duplicate', mnt_column: 'promo_code' },
  ], ruleTypes)
  assert.equal(error, 'Target column PROMO_CODE is duplicated')
})

test('validateMapping rejects a VALUE_MAP that is not a string map', () => {
  const error = validateMapping([{
    ...directColumn,
    rule_type: 'VALUE_MAP',
    rule_value: '["STORE", "S"]',
  }], ruleTypes)
  assert.match(error ?? '', /valid JSON object/)
})

test('preview safely handles malformed VALUE_MAP JSON', () => {
  const result = computeAfter({ promo_code: 'STORE_123' }, [{
    ...directColumn,
    rule_type: 'VALUE_MAP',
    rule_value: 'null',
  }])
  assert.equal(result, null)
})
