// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, fireEvent, cleanup, screen } from '@testing-library/react'
import { AnimatePresence } from 'framer-motion'
import { Modal } from './Modal'
import { SlideOverPanel } from './SlideOverPanel'

afterEach(cleanup)

function pressEscape() {
  fireEvent.keyDown(document, { key: 'Escape' })
}

function pressTab(shiftKey = false) {
  fireEvent.keyDown(document, { key: 'Tab', shiftKey })
}

function renderModal(
  children: React.ReactNode,
  { isOpen = true, onClose = vi.fn() } = {}
) {
  render(
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      {children}
    </Modal>
  )
  return onClose
}

describe('Modal keyboard handling', () => {
  it('closes on Escape', () => {
    const onClose = renderModal(<button>Inside</button>)

    pressEscape()

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('ignores Escape while closed', () => {
    const onClose = renderModal(<button>Inside</button>, { isOpen: false })

    pressEscape()

    expect(onClose).not.toHaveBeenCalled()
  })

  it('wraps Tab from the last control back to the first', () => {
    renderModal(
      <>
        <button>First</button>
        <button>Last</button>
      </>
    )
    screen.getByText('Last').focus()

    pressTab()

    // The header's Close button is the first control in the panel.
    expect(document.activeElement).toBe(screen.getByLabelText('Close'))
  })

  it('wraps Shift+Tab from the first control round to the last', () => {
    renderModal(
      <>
        <button>First</button>
        <button>Last</button>
      </>
    )
    screen.getByLabelText('Close').focus()

    pressTab(true)

    expect(document.activeElement).toBe(screen.getByText('Last'))
  })

  it('enters at the first control when focus is resting on the panel', () => {
    renderModal(<button>First</button>)

    // Opening leaves focus on the panel itself; Shift+Tab there must wrap
    // backwards into the panel rather than escaping to the app behind it.
    pressTab(true)

    expect(document.activeElement).toBe(screen.getByText('First'))
  })

  it('returns focus to whatever opened it', () => {
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Modal isOpen={open} onClose={() => setOpen(false)} title="Settings">
            <button>Inside</button>
          </Modal>
        </>
      )
    }
    render(<Harness />)
    const trigger = screen.getByText('Open')
    trigger.focus()

    fireEvent.click(trigger)
    expect(document.activeElement).not.toBe(trigger)
    pressEscape()

    expect(document.activeElement).toBe(trigger)
  })
})

// Settings stays mounted underneath the panels it launches, so both overlays
// are live at once and only the top one may answer the keyboard.
describe('stacked overlays', () => {
  function Stack({ onCloseModal, onClosePanel }: {
    onCloseModal: () => void
    onClosePanel: () => void
  }) {
    return (
      <>
        <Modal isOpen onClose={onCloseModal} title="Settings">
          <button>In modal</button>
        </Modal>
        <AnimatePresence>
          <SlideOverPanel title="The science" onClose={onClosePanel}>
            <button>In panel</button>
          </SlideOverPanel>
        </AnimatePresence>
      </>
    )
  }

  it('sends Escape only to the panel on top', () => {
    const onCloseModal = vi.fn()
    const onClosePanel = vi.fn()
    render(<Stack onCloseModal={onCloseModal} onClosePanel={onClosePanel} />)

    pressEscape()

    expect(onClosePanel).toHaveBeenCalledTimes(1)
    expect(onCloseModal).not.toHaveBeenCalled()
  })

  it('contains Tab in the panel on top, not the modal underneath', () => {
    render(<Stack onCloseModal={vi.fn()} onClosePanel={vi.fn()} />)
    screen.getByText('In panel').focus()

    pressTab()

    expect(document.activeElement).toBe(screen.getByLabelText('Go back'))
  })

  it('hands the keyboard back to the modal once the panel unmounts', () => {
    const onCloseModal = vi.fn()
    function Harness() {
      const [showPanel, setShowPanel] = useState(true)
      return (
        <>
          <Modal isOpen onClose={onCloseModal} title="Settings">
            <button>In modal</button>
          </Modal>
          <AnimatePresence>
            {showPanel && (
              <SlideOverPanel title="The science" onClose={() => setShowPanel(false)}>
                <button>In panel</button>
              </SlideOverPanel>
            )}
          </AnimatePresence>
        </>
      )
    }
    render(<Harness />)

    fireEvent.click(screen.getByLabelText('Go back'))
    pressEscape()

    expect(onCloseModal).toHaveBeenCalledTimes(1)
  })
})
