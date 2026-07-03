import { describe, it, expect, beforeEach } from 'vitest'
import { useCurriculumStore } from './curriculumStore'

describe('curriculumStore', () => {
  beforeEach(() => {
    useCurriculumStore.setState({ active: 'multiply' })
  })

  it('defaults to multiply', () => {
    useCurriculumStore.getState().initialize()
    expect(useCurriculumStore.getState().active).toBe('multiply')
  })

  it('persists and restores the active curriculum', () => {
    useCurriculumStore.getState().setActive('divide')
    useCurriculumStore.setState({ active: 'multiply' })
    useCurriculumStore.getState().initialize()
    expect(useCurriculumStore.getState().active).toBe('divide')
  })

  it('ignores corrupt persisted values', () => {
    localStorage.setItem('ttt_curriculum', JSON.stringify('subtract'))
    useCurriculumStore.getState().initialize()
    expect(useCurriculumStore.getState().active).toBe('multiply')
  })
})
