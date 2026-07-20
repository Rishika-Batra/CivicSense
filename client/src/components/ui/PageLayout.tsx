import React from 'react'

interface PageLayoutProps {
  children: React.ReactNode
  /** Constrain inner content width. Default true. Set false for full-bleed pages like CityMap. */
  constrained?: boolean
  /** Extra classes on the outer wrapper */
  className?: string
}

/**
 * Full-viewport dark dashboard layout shared by all authenticated pages.
 * - Outer: min-h-screen, bg-slate-950, relative with ambient glows
 * - Inner: max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6
 */
export const PageLayout: React.FC<PageLayoutProps> = ({
  children,
  constrained = true,
  className = '',
}) => {
  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden ${className}`}>
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute top-0 right-0 w-[500px] h-[500px] bg-teal-500/4 rounded-full blur-3xl -z-10" />
      <div className="pointer-events-none absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-500/4 rounded-full blur-3xl -z-10" />

      {constrained ? (
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  )
}
