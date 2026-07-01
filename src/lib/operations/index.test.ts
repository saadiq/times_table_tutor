import { describe, it, expect } from 'vitest'
import { multiplyOperation, formatEquation } from './index'
import { makeFact } from '../../test/factories'

describe('formatEquation', () => {
  it('renders a full multiplication equation', () => {
    expect(formatEquation(multiplyOperation, makeFact(7, 8))).toBe('7 × 8 = 56')
  })
})
