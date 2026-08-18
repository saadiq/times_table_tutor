// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { ActivityCalendar } from './ActivityCalendar'

describe('ActivityCalendar', () => {
  afterEach(cleanup)

  it('labels the card with a heading', () => {
    render(<ActivityCalendar />)
    expect(screen.getByRole('heading', { name: /practice activity/i })).toBeTruthy()
  })
})
