'use client'

import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import React, { createContext, useCallback, useEffect, useRef, useState } from 'react'
import { NavbarItem } from './navbar'

export const MobileSidebarContext = createContext<(() => void) | null>(null)

function OpenMenuIcon() {
  return (
    <svg data-slot="icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d="M2 6.75C2 6.33579 2.33579 6 2.75 6H17.25C17.6642 6 18 6.33579 18 6.75C18 7.16421 17.6642 7.5 17.25 7.5H2.75C2.33579 7.5 2 7.16421 2 6.75ZM2 13.25C2 12.8358 2.33579 12.5 2.75 12.5H17.25C17.6642 12.5 18 12.8358 18 13.25C18 13.6642 17.6642 14 17.25 14H2.75C2.33579 14 2 13.6642 2 13.25Z" />
    </svg>
  )
}

export function SidebarLayout({
  navbar,
  sidebar,
  scrollable = true,
  children,
}: React.PropsWithChildren<{ navbar: React.ReactNode; sidebar: React.ReactNode; scrollable?: boolean }>) {
  const [showSidebar, setShowSidebar] = useState(false)
  const closeSidebar = useCallback(() => setShowSidebar(false), [])
  const mainRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (mainRef.current) {
      if (showSidebar) {
        mainRef.current.setAttribute('inert', '')
      } else {
        mainRef.current.removeAttribute('inert')
      }
    }
  }, [showSidebar])

  useEffect(() => {
    if (!showSidebar) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeSidebar()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [showSidebar, closeSidebar])

  return (
    <MobileSidebarContext.Provider value={closeSidebar}>
      <div className="relative isolate flex min-h-svh w-full bg-white max-lg:flex-col lg:bg-zinc-100 dark:bg-zinc-900 dark:lg:bg-zinc-950">
        {/* Mobile backdrop overlay */}
        <div
          className={clsx('lg:hidden fixed inset-0 z-50', !showSidebar && 'pointer-events-none')}
          role="dialog"
          aria-modal={showSidebar}
          aria-hidden={!showSidebar}
        >
          <AnimatePresence>
            {showSidebar && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="fixed inset-0 bg-black/30"
                onClick={closeSidebar}
                aria-hidden="true"
              />
            )}
          </AnimatePresence>
        </div>

        {/*
          Sidebar — rendered ONCE.
          On desktop (lg+): fixed left column, always visible.
          On mobile (<lg): slides in/out from the left as a drawer.
        */}
        <div
          className={clsx(
            // Desktop: fixed sidebar
            'lg:fixed lg:inset-y-0 lg:left-0 lg:w-64',
            // Mobile: slide-out drawer positioned above the backdrop
            'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-full max-lg:max-w-80 max-lg:p-2',
            'max-lg:transition-transform max-lg:duration-300 max-lg:ease-in-out',
            showSidebar ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
            !showSidebar && 'max-lg:pointer-events-none',
          )}
        >
          {/* Mobile: wrap in styled container. Desktop: render directly */}
          <div className="max-lg:flex max-lg:h-full max-lg:flex-col max-lg:rounded-lg max-lg:bg-white max-lg:shadow-xs max-lg:ring-1 max-lg:ring-zinc-950/5 dark:max-lg:bg-zinc-900 dark:max-lg:ring-white/10 lg:contents">
            {sidebar}
          </div>
        </div>

        {/* Navbar on mobile */}
        <header className="flex items-center px-4 lg:hidden">
          <div className="py-2.5">
            <NavbarItem onClick={() => setShowSidebar(true)} aria-label="Open navigation">
              <OpenMenuIcon />
            </NavbarItem>
          </div>
          <div className="min-w-0 flex-1">{navbar}</div>
        </header>

        {/* Content */}
        <main ref={mainRef} className="flex flex-1 flex-col pb-2 lg:min-w-0 lg:pt-2 lg:pr-2 lg:pl-64 overflow-hidden">
          <div className={`flex flex-col grow py-4 px-6 lg:p-6 lg:rounded-lg lg:bg-white lg:shadow-xs lg:ring-1 lg:ring-zinc-950/5 dark:lg:bg-zinc-900 dark:lg:ring-white/10 ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'}`}>
            {children}
          </div>
        </main>
      </div>
    </MobileSidebarContext.Provider>
  )
}
