import { describe, expect, it } from 'vitest'

import { buildSteps, resultText } from './eventStatus'

describe('event lifecycle presentation', () => {
  it('places validation failures at Processing', () => {
    const steps = buildSteps('FAILED', new Set(['RECEIVED', 'PROCESSING', 'FAILED']))

    expect(steps.map((step) => step.state)).toEqual(['done', 'error', 'todo', 'error'])
  })

  it('places write failures at Writing when the log reached writing', () => {
    const steps = buildSteps('FAILED', new Set(['RECEIVED', 'PROCESSING', 'WRITING', 'FAILED']))

    expect(steps.map((step) => step.state)).toEqual(['done', 'done', 'error', 'error'])
  })

  it('uses an operator-friendly result for pending retries', () => {
    expect(resultText('PENDING_WRITE')).toBe('Retry pending')
  })

  it('keeps queued events before Processing and marks Writing as current', () => {
    expect(buildSteps('RECEIVED', new Set()).map((step) => step.state))
      .toEqual(['done', 'todo', 'todo', 'todo'])
    expect(buildSteps('WRITING', new Set(['PROCESSING'])).map((step) => step.state))
      .toEqual(['done', 'done', 'current', 'todo'])
  })
})
