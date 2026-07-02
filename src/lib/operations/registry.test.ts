import { describe, it, expect } from 'vitest'
import { getOperation, multiplyOperation } from './index'

describe('getOperation', () => {
  it('resolves the multiply operation', () => {
    expect(getOperation('multiply')).toBe(multiplyOperation)
  })
})
