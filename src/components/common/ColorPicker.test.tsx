// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, fireEvent, cleanup, screen } from '@testing-library/react'
import { ColorPicker } from './ColorPicker'
import { PROFILE_COLORS } from '../../types/api'

describe('ColorPicker', () => {
  afterEach(cleanup)

  it('renders one swatch per profile color', () => {
    render(<ColorPicker selected="garden-500" onSelect={() => {}} />)

    for (const color of PROFILE_COLORS) {
      expect(screen.getByRole('button', { name: color })).toBeTruthy()
    }
  })

  it('reports the clicked color', () => {
    const onSelect = vi.fn()
    render(<ColorPicker selected="garden-500" onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'sky-400' }))

    expect(onSelect).toHaveBeenCalledWith('sky-400')
  })
})
