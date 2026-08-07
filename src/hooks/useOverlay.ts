import { useEffect, useRef } from 'react'

/**
 * Open overlay panels, outermost first. Settings stays mounted underneath the
 * panels it launches, so a single "is this the top one?" check is what keeps
 * Escape from closing two things at once and keeps focus in the panel on top.
 */
const openOverlays: HTMLElement[] = []

/**
 * Everything below the top overlay is covered but otherwise untouched: it keeps
 * its aria-modal, and a screen reader that latched onto it goes on reading it
 * instead of the panel now in front. `inert` is what takes a whole subtree out
 * of the accessibility tree and out of tabbing at once, so the child using a
 * screen reader gets the same one live dialog everyone else sees.
 */
function syncInert() {
  openOverlays.forEach((panel, i) => {
    panel.inert = i !== openOverlays.length - 1
  })
}

const FOCUSABLE =
  'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]'

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      el.getAttribute('tabindex') !== '-1' &&
      // matches(':disabled') rather than .disabled: a control inside a disabled
      // fieldset is unfocusable without carrying the attribute itself.
      !el.matches(':disabled') &&
      // A control the browser would skip must not end up as the ring's edge:
      // Tab off the last *visible* one would then find no edge to wrap, and
      // native tabbing carries focus out to the app behind the overlay.
      // Optional call — jsdom has no layout and no checkVisibility, and
      // undefined must mean "keep" rather than empty the ring.
      el.checkVisibility?.() !== false
  )
}

/**
 * Modal behaviour for the two shared overlay primitives, Modal and
 * SlideOverPanel: Escape dismisses, Tab stays inside, and focus returns to
 * whatever opened it. Without the containment a keyboard user tabs straight out
 * of the panel into the app behind it, which is covered up and unreachable by
 * touch — they end up driving controls they can't see. The older one-off
 * overlays under components/garden, learn, and progress don't route through
 * here yet.
 *
 * Attach the returned ref to the panel element and give it `tabIndex={-1}` so
 * focus can rest on the container. `isOpen` is what holds the keyboard: pass a
 * prop for an overlay that stays mounted while closed, and leave it out for one
 * that only exists while it is open, so it holds until it is actually gone. Not
 * framer's presence — that flips at the *start* of an exit animation, handing
 * Escape and focus to the layer underneath while this one still covers it.
 */
export function useOverlay(onClose: () => void, isOpen = true) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    const panel = panelRef.current
    if (!isOpen || !panel) return

    openOverlays.push(panel)
    const trigger = document.activeElement as HTMLElement | null
    // The container, not the first control: it sets the tab starting point and
    // gives screen readers the dialog to announce, without lighting up a focus
    // ring on a button nobody chose. Ahead of syncInert, so the overlay below
    // is not made inert while the trigger inside it still holds focus.
    panel.focus()
    syncInert()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (openOverlays[openOverlays.length - 1] !== panel) return

      if (event.key === 'Escape') {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const items = focusableWithin(panel)
      if (items.length === 0) {
        event.preventDefault()
        return
      }

      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      // The container counts as outside the ring: resting there, Tab enters at
      // the first control and Shift+Tab wraps to the last instead of escaping.
      const inside = active !== panel && panel.contains(active)
      const atEdge = active === (event.shiftKey ? first : last)
      if (inside && !atEdge) return

      event.preventDefault()
      ;(event.shiftKey ? last : first).focus()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      openOverlays.splice(openOverlays.indexOf(panel), 1)
      // Before the focus call: the trigger usually sits in the overlay this one
      // was covering, which is inert until syncInert promotes it back. This
      // panel is off the stack now, so nothing there would clear its own flag —
      // a Modal, which stays mounted while closed, would reopen unusable.
      panel.inert = false
      syncInert()
      trigger?.focus()
    }
  }, [isOpen])

  return panelRef
}
