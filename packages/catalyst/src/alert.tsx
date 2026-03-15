'use client'

import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { createContext, useContext, useEffect, useId } from 'react'
import { Text } from './text'

const sizes = {
  xs: 'sm:max-w-xs',
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '3xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-4xl',
  '5xl': 'sm:max-w-5xl',
}

interface AlertContextValue {
  titleId: string
  descriptionId: string
}

const AlertContext = createContext<AlertContextValue>({
  titleId: '',
  descriptionId: '',
})

export function Alert({
  open,
  onClose,
  size = 'md',
  className,
  children,
}: {
  open: boolean
  onClose: () => void
  size?: keyof typeof sizes
  className?: string
  children: React.ReactNode
}) {
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AlertContext.Provider value={{ titleId, descriptionId }}>
      <AnimatePresence>
        {open && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="fixed inset-0 z-50"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1, ease: 'easeOut' }}
              className="fixed inset-0 flex w-screen justify-center overflow-y-auto bg-zinc-950/15 px-2 py-2 focus:outline-0 sm:px-6 sm:py-8 lg:px-8 lg:py-16 dark:bg-zinc-950/50"
              onClick={onClose}
              aria-hidden="true"
            />

            <div className="fixed inset-0 w-screen overflow-y-auto pt-6 sm:pt-0">
              <div className="grid min-h-full grid-rows-[1fr_auto_1fr] justify-items-center p-8 sm:grid-rows-[1fr_auto_3fr] sm:p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.1, ease: 'easeOut' }}
                  className={clsx(
                    className,
                    sizes[size],
                    'row-start-2 w-full rounded-2xl bg-white p-8 shadow-lg ring-1 ring-zinc-950/10 sm:rounded-2xl sm:p-6 dark:bg-zinc-900 dark:ring-white/10 forced-colors:outline',
                  )}
                >
                  {children}
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </AlertContext.Provider>
  )
}

export function AlertTitle({ className, ...props }: React.ComponentPropsWithoutRef<'h2'>) {
  const { titleId } = useContext(AlertContext)

  return (
    <h2
      id={titleId}
      {...props}
      className={clsx(
        className,
        'text-center text-base/6 font-semibold text-balance text-zinc-950 sm:text-left sm:text-sm/6 sm:text-wrap dark:text-white',
      )}
    />
  )
}

export function AlertDescription({ className, ...props }: React.ComponentPropsWithoutRef<typeof Text>) {
  const { descriptionId } = useContext(AlertContext)

  return (
    <Text
      id={descriptionId}
      {...props}
      className={clsx(className, 'mt-2 text-center text-pretty sm:text-left')}
    />
  )
}

export function AlertBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={clsx(className, 'mt-4')} />
}

export function AlertActions({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={clsx(
        className,
        'mt-6 flex flex-col-reverse items-center justify-end gap-3 *:w-full sm:mt-4 sm:flex-row sm:*:w-auto',
      )}
    />
  )
}
