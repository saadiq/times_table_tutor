import { useEffect, useRef } from 'react'

/**
 * Open overlays, outermost first. Settings stays mounted underneath the panels
 * it launches, so a single "is this the top one?" check is what keeps Escape
 * from closing two things at once and keeps focus in the panel on top.
 */
const openOverlays: object[] = []

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]'

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    // matches(':disabled') rather than .disabled: a control inside a disabled
    // fieldset is unfocusable without carrying the attribute itself.
    (el) => el.getAttribute('tabindex') !== '-1' && !el.matches(':disabled')
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

    const token = {}
    openOverlays.push(token)
    const trigger = document.activeElement as HTMLElement | null
    // The container, not the first control: it sets the tab starting point and
    // gives screen readers the dialog to announce, without lighting up a focus
    // ring on a button nobody chose.
    panel.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (openOverlays[openOverlays.length - 1] !== token) return

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
      openOverlays.splice(openOverlays.indexOf(token), 1)
      trigger?.focus()
    }
  }, [isOpen])

  return panelRef
}
