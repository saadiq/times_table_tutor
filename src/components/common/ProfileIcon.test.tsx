// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { ProfileIcon } from './ProfileIcon'

describe('ProfileIcon', () => {
  afterEach(cleanup)

  it('renders the generic glyph for icons it does not know', () => {
    for (const icon of ['constructor', 'toString', 'hasOwnProperty', 'nonsense', '']) {
      // Prototype keys are reachable: POST /api/profiles does not validate the
      // icon. A lookup that resolved one would hand React a non-component and
      // throw on every surface showing the profile — including the settings row
      // that is the only way to change the icon back.
      const { container } = render(<ProfileIcon icon={icon} className="glyph" />)
      expect(container.querySelector('svg.glyph')).toBeTruthy()
      cleanup()
    }
  })

  it('renders a different glyph for an icon it does know', () => {
    const known = render(<ProfileIcon icon="cat" />).container.innerHTML
    cleanup()
    const unknown = render(<ProfileIcon icon="constructor" />).container.innerHTML

    expect(known).not.toBe(unknown)
  })
})
