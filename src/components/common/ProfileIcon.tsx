import { User } from 'lucide-react'
import { iconMap } from '../../lib/iconMap'
import type { ProfileIcon as ProfileIconName } from '../../types/api'

type ProfileIconProps = {
  /** The profile's stored icon; may be absent or unrecognized. */
  icon?: string | null
  className?: string
}

/**
 * Renders a profile's icon, degrading to a generic glyph when the value is
 * missing or unknown. The fallback lives here rather than at each call site:
 * an icon this app doesn't recognize must never blank out the UI that could
 * change it.
 */
export function ProfileIcon({ icon, className }: ProfileIconProps) {
  const Glyph = (icon && iconMap[icon as ProfileIconName]) || User
  return <Glyph className={className} />
}
