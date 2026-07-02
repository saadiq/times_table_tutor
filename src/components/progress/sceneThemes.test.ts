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

  it('provides a complete, distinct divide theme', () => {
    const divide = getSceneTheme('divide')
    const multiply = getSceneTheme('multiply')
    expect(divide.characters).toHaveLength(12)
    expect(divide.characters.map((c) => c.table)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(divide.visuals.animals).toHaveLength(12)
    expect(divide.visuals.palette.sky).toHaveLength(5)
    expect(divide.tierMessages).toHaveLength(5)
    expect(divide).not.toBe(multiply)
    expect(divide.visuals.palette.sky[0]).not.toEqual(multiply.visuals.palette.sky[0])
    const multiplyNames = new Set(multiply.characters.map((c) => c.name))
    expect(divide.characters.every((c) => !multiplyNames.has(c.name))).toBe(true)
  })
})
