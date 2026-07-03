import type { ReactNode } from 'react'
import { Navigation } from './Navigation'
import { CurriculumToggle } from './CurriculumToggle'

type LayoutProps = {
  children: ReactNode
  showNav?: boolean
}

export function Layout({ children, showNav = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-cream)]">
      <header className="sticky top-0 z-40 flex justify-center py-2 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <CurriculumToggle />
      </header>
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      {showNav && <Navigation />}
    </div>
  )
}
