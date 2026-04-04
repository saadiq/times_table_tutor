import type { ReactNode } from 'react'
import { Navigation } from './Navigation'

type LayoutProps = {
  children: ReactNode
  showNav?: boolean
}

export function Layout({ children, showNav = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-cream)]">
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      {showNav && <Navigation />}
    </div>
  )
}
