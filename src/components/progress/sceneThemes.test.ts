import { describe, it, expect } from 'vitest'
import { getSceneTheme } from './sceneThemes'

describe('scene themes', () => {
  it('provides a complete multiply theme', () => {
    const theme = getSceneTheme('multiply')
    expect(theme.characters).toHaveLength(12)
    expect(theme.characters.map((c) => c.table)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(theme.visuals.animals).toHaveLength(12)
    expect(theme.visuals.palette.sky).toHaveLength(5)
    expect(theme.tierMessages).toHaveLength(5)
  })
})
