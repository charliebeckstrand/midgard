'use client'

import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { Button } from './button'
import { Link } from './link'

interface DropdownContextValue {
  open: boolean
  toggle: () => void
  close: () => void
  buttonId: string
  menuId: string
}

const DropdownContext = createContext<DropdownContextValue>({
  open: false,
  toggle: () => {},
  close: () => {},
  buttonId: '',
  menuId: '',
})

export function Dropdown({ children, ...props }: React.PropsWithChildren<{ className?: string }>) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonId = useId()
  const menuId = useId()

  const toggle = useCallback(() => setOpen((prev) => !prev), [])
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return

    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <DropdownContext.Provider value={{ open, toggle, close, buttonId, menuId }}>
      <div ref={containerRef} className={clsx('relative', props.className)} {...props}>
        {children}
      </div>
    </DropdownContext.Provider>
  )
}

export function DropdownButton<T extends React.ElementType = typeof Button>({
  as,
  ...props
}: { as?: T; className?: string } & Omit<React.ComponentPropsWithoutRef<T>, 'className'>) {
  const { toggle, open, buttonId, menuId } = useContext(DropdownContext)
  const Component = (as || Button) as React.ElementType

  return (
    <Component
      {...props}
      id={buttonId}
      aria-expanded={open}
      aria-haspopup="menu"
      aria-controls={open ? menuId : undefined}
      onClick={(e: React.MouseEvent) => {
        const onClickProp = (props as { onClick?: (e: React.MouseEvent) => void }).onClick
        onClickProp?.(e)
        toggle()
      }}
    />
  )
}

const anchorPositionClasses: Record<string, string> = {
  bottom: 'top-full left-0 mt-2',
  'bottom start': 'top-full left-0 mt-2',
  'bottom end': 'top-full right-0 mt-2',
  top: 'bottom-full left-0 mb-2',
  'top start': 'bottom-full left-0 mb-2',
  'top end': 'bottom-full right-0 mb-2',
}

export function DropdownMenu({
  anchor = 'bottom',
  className,
  children,
}: {
  anchor?: string
  className?: string
  children: React.ReactNode
}) {
  const { open, close, menuId, buttonId } = useContext(DropdownContext)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !menuRef.current) return

    menuRef.current.focus()
  }, [open])

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const menu = menuRef.current
    if (!menu) return

    const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([data-disabled])'))
    const currentIndex = items.indexOf(document.activeElement as HTMLElement)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = currentIndex === -1 ? 0 : currentIndex < items.length - 1 ? currentIndex + 1 : 0
      items[next]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = currentIndex === -1 ? items.length - 1 : currentIndex > 0 ? currentIndex - 1 : items.length - 1
      items[prev]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      items[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1]?.focus()
    }
  }

  const positionClass = anchorPositionClasses[anchor] ?? anchorPositionClasses.bottom

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-labelledby={buttonId}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1, ease: 'easeOut' }}
          onKeyDown={handleKeyDown}
          className={clsx(
            className,
            'absolute z-50',
            positionClass,
            // Base styles
            'isolate w-max rounded-xl p-1',
            // Invisible border that is only visible in `forced-colors` mode for accessibility purposes
            'outline outline-transparent focus:outline-hidden',
            // Handle scrolling when menu won't fit in viewport
            'overflow-y-auto',
            // Popover background
            'bg-white/75 backdrop-blur-xl dark:bg-zinc-800/75',
            // Shadows
            'shadow-lg ring-1 ring-zinc-950/10 dark:ring-white/10 dark:ring-inset',
            // Define grid at the menu level if subgrid is supported
            'supports-[grid-template-columns:subgrid]:grid supports-[grid-template-columns:subgrid]:grid-cols-[auto_1fr_1.5rem_0.5rem_auto]',
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function DropdownItem({
  className,
  ...props
}: { className?: string } & (
  | ({ href?: never; onClick?: () => void; disabled?: boolean } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
  | ({ href: string; disabled?: boolean } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
)) {
  const { close } = useContext(DropdownContext)

  const classes = clsx(
    className,
    // Base styles
    'group cursor-default rounded-lg px-3.5 py-2.5 focus:outline-hidden sm:px-3 sm:py-1.5',
    // Text styles
    'text-left text-base/6 text-zinc-950 sm:text-sm/6 dark:text-white forced-colors:text-[CanvasText]',
    // Focus
    'data-focus:bg-blue-500 data-focus:text-white',
    // Disabled state
    'data-disabled:opacity-50',
    // Forced colors mode
    'forced-color-adjust-none forced-colors:data-focus:bg-[Highlight] forced-colors:data-focus:text-[HighlightText] forced-colors:data-focus:*:data-[slot=icon]:text-[HighlightText]',
    // Use subgrid when available but fallback to an explicit grid layout if not
    'col-span-full grid grid-cols-[auto_1fr_1.5rem_0.5rem_auto] items-center supports-[grid-template-columns:subgrid]:grid-cols-subgrid',
    // Icons
    '*:data-[slot=icon]:col-start-1 *:data-[slot=icon]:row-start-1 *:data-[slot=icon]:mr-2.5 *:data-[slot=icon]:-ml-0.5 *:data-[slot=icon]:size-5 sm:*:data-[slot=icon]:mr-2 sm:*:data-[slot=icon]:size-4',
    '*:data-[slot=icon]:text-zinc-500 data-focus:*:data-[slot=icon]:text-white dark:*:data-[slot=icon]:text-zinc-400 dark:data-focus:*:data-[slot=icon]:text-white',
    // Avatar
    '*:data-[slot=avatar]:mr-2.5 *:data-[slot=avatar]:-ml-1 *:data-[slot=avatar]:size-6 sm:*:data-[slot=avatar]:mr-2 sm:*:data-[slot=avatar]:size-5',
  )

  function handleFocus(e: React.FocusEvent<HTMLElement>) {
    e.currentTarget.setAttribute('data-focus', '')
  }

  function handleBlur(e: React.FocusEvent<HTMLElement>) {
    e.currentTarget.removeAttribute('data-focus')
  }

  function handleMouseEnter(e: React.MouseEvent<HTMLElement>) {
    e.currentTarget.setAttribute('data-focus', '')
    e.currentTarget.focus()
  }

  function handleMouseLeave(e: React.MouseEvent<HTMLElement>) {
    e.currentTarget.removeAttribute('data-focus')
  }

  if (typeof props.href === 'string') {
    const { disabled, ...linkProps } = props as { href: string; disabled?: boolean } & React.ComponentPropsWithoutRef<typeof Link>

    return (
      <Link
        {...linkProps}
        role="menuitem"
        tabIndex={-1}
        data-disabled={disabled ? '' : undefined}
        className={classes}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => {
          if (disabled) {
            e.preventDefault()
            return
          }
          close()
          linkProps.onClick?.(e)
        }}
      />
    )
  }

  const { disabled, onClick, ...buttonProps } = props as { disabled?: boolean; onClick?: () => void } & React.ComponentPropsWithoutRef<'button'>

  return (
    <button
      type="button"
      {...buttonProps}
      role="menuitem"
      tabIndex={-1}
      data-disabled={disabled ? '' : undefined}
      className={classes}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => {
        if (disabled) return
        close()
        onClick?.()
      }}
    />
  )
}

export function DropdownHeader({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div {...props} className={clsx(className, 'col-span-5 px-3.5 pt-2.5 pb-1 sm:px-3')} />
}

export function DropdownSection({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={clsx(
        className,
        // Define grid at the section level instead of the item level if subgrid is supported
        'col-span-full supports-[grid-template-columns:subgrid]:grid supports-[grid-template-columns:subgrid]:grid-cols-[auto_1fr_1.5rem_0.5rem_auto]',
      )}
    />
  )
}

export function DropdownHeading({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={clsx(
        className,
        'col-span-full grid grid-cols-[1fr_auto] gap-x-12 px-3.5 pt-2 pb-1 text-sm/5 font-medium text-zinc-500 sm:px-3 sm:text-xs/5 dark:text-zinc-400',
      )}
    />
  )
}

export function DropdownDivider({ className, ...props }: React.ComponentPropsWithoutRef<'hr'>) {
  return (
    <hr
      {...props}
      role="separator"
      className={clsx(
        className,
        'col-span-full mx-3.5 my-1 h-px border-0 bg-zinc-950/5 sm:mx-3 dark:bg-white/10 forced-colors:bg-[CanvasText]',
      )}
    />
  )
}

export function DropdownLabel({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div {...props} data-slot="label" className={clsx(className, 'col-start-2 row-start-1')} />
}

export function DropdownDescription({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
  return (
    <p
      data-slot="description"
      {...props}
      className={clsx(
        className,
        'col-span-2 col-start-2 row-start-2 text-sm/5 text-zinc-500 group-data-focus:text-white sm:text-xs/5 dark:text-zinc-400 forced-colors:group-data-focus:text-[HighlightText]',
      )}
    />
  )
}

export function DropdownShortcut({
  keys,
  className,
  ...props
}: { keys: string | string[]; className?: string } & Omit<React.ComponentPropsWithoutRef<'kbd'>, 'className'>) {
  return (
    <kbd
      {...props}
      className={clsx(className, 'col-start-5 row-start-1 flex justify-self-end')}
    >
      {(Array.isArray(keys) ? keys : keys.split('')).map((char, index) => (
        <kbd
          key={index}
          className={clsx([
            'min-w-[2ch] text-center font-sans text-zinc-400 capitalize group-data-focus:text-white forced-colors:group-data-focus:text-[HighlightText]',
            // Make sure key names that are longer than one character (like "Tab") have extra space
            index > 0 && char.length > 1 && 'pl-1',
          ])}
        >
          {char}
        </kbd>
      ))}
    </kbd>
  )
}
