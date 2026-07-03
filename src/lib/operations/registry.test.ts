import { describe, it, expect } from 'vitest'
import { getOperation, multiplyOperation } from './index'

describe('getOperation', () => {
  it('resolves the multiply operation', () => {
    expect(getOperation('multiply')).toBe(multiplyOperation)
  })

  it('resolves the divide operation', () => {
    expect(getOperation('divide').id).toBe('divide')
    expect(getOperation('divide').symbol).toBe('÷')
  })
})
