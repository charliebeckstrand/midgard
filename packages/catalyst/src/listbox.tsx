'use client'

import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'

interface ListboxContextValue {
  open: boolean
  value: unknown
  onChange: (value: unknown) => void
  close: () => void
  disabled?: boolean
  invalid?: boolean
  buttonId: string
  listId: string
}

const ListboxContext = createContext<ListboxContextValue>({
  open: false,
  value: undefined,
  onChange: () => {},
  close: () => {},
  buttonId: '',
  listId: '',
})

interface SelectedOptionContextValue {
  isSelectedOption: boolean
}

const SelectedOptionContext = createContext<SelectedOptionContextValue>({ isSelectedOption: false })

export function Listbox<T>({
  className,
  placeholder,
  autoFocus,
  'aria-label': ariaLabel,
  children: options,
  value,
  defaultValue,
  onChange,
  disabled,
  invalid,
  name,
  ...props
}: {
  className?: string
  placeholder?: React.ReactNode
  autoFocus?: boolean
  'aria-label'?: string
  children?: React.ReactNode
  value?: T
  defaultValue?: T
  onChange?: (value: T) => void
  disabled?: boolean
  invalid?: boolean
  name?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'onChange'>) {
  const [open, setOpen] = useState(false)
  const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonId = useId()
  const listId = useId()

  const currentValue = value !== undefined ? value : internalValue

  const close = useCallback(() => setOpen(false), [])

  const handleChange = useCallback(
    (newValue: unknown) => {
      if (value === undefined) {
        setInternalValue(newValue as T)
      }
      onChange?.(newValue as T)
      setOpen(false)
    },
    [value, onChange],
  )

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
    <ListboxContext.Provider value={{ open, value: currentValue, onChange: handleChange, close, disabled, invalid, buttonId, listId }}>
      <div ref={containerRef} className="relative" {...props}>
        <button
          type="button"
          id={buttonId}
          autoFocus={autoFocus}
          data-slot="control"
          aria-label={ariaLabel}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          data-disabled={disabled ? '' : undefined}
          data-invalid={invalid ? '' : undefined}
          disabled={disabled}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          onMouseEnter={(e) => e.currentTarget.setAttribute('data-hover', '')}
          onMouseLeave={(e) => e.currentTarget.removeAttribute('data-hover')}
          onFocus={(e) => e.currentTarget.setAttribute('data-focus', '')}
          onBlur={(e) => e.currentTarget.removeAttribute('data-focus')}
          className={clsx([
            className,
            // Basic layout
            'group relative block w-full',
            // Background color + shadow applied to inset pseudo element, so shadow blends with border in light mode
            'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-white before:shadow-sm',
            // Background color is moved to control and shadow is removed in dark mode so hide `before` pseudo
            'dark:before:hidden',
            // Hide default focus styles
            'focus:outline-hidden',
            // Focus ring
            'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset data-focus:after:ring-2 data-focus:after:ring-blue-500',
            // Disabled state
            'data-disabled:opacity-50 data-disabled:before:bg-zinc-950/5 data-disabled:before:shadow-none',
          ])}
        >
          <span
            className={clsx([
              // Basic layout
              'relative block w-full appearance-none rounded-lg py-[calc(--spacing(2.5)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
              // Set minimum height for when no value is selected
              'min-h-11 sm:min-h-9',
              // Horizontal padding
              'pr-[calc(--spacing(7)-1px)] pl-[calc(--spacing(3.5)-1px)] sm:pl-[calc(--spacing(3)-1px)]',
              // Typography
              'text-left text-base/6 text-zinc-950 placeholder:text-zinc-500 sm:text-sm/6 dark:text-white forced-colors:text-[CanvasText]',
              // Border
              'border border-zinc-950/10 group-data-active:border-zinc-950/20 group-data-hover:border-zinc-950/20 dark:border-white/10 dark:group-data-active:border-white/20 dark:group-data-hover:border-white/20',
              // Background color
              'bg-transparent dark:bg-white/5',
              // Invalid state
              'group-data-invalid:border-red-500 group-data-hover:group-data-invalid:border-red-500 dark:group-data-invalid:border-red-600 dark:data-hover:group-data-invalid:border-red-600',
              // Disabled state
              'group-data-disabled:border-zinc-950/20 group-data-disabled:opacity-100 dark:group-data-disabled:border-white/15 dark:group-data-disabled:bg-white/2.5 dark:group-data-disabled:data-hover:border-white/15',
            ])}
          >
            <SelectedOptionContext.Provider value={{ isSelectedOption: true }}>
              {currentValue !== undefined ? options : (placeholder && <span className="block truncate text-zinc-500">{placeholder}</span>)}
            </SelectedOptionContext.Provider>
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <svg
              className="size-5 stroke-zinc-500 group-data-disabled:stroke-zinc-600 sm:size-4 dark:stroke-zinc-400 forced-colors:stroke-[CanvasText]"
              viewBox="0 0 16 16"
              aria-hidden="true"
              fill="none"
            >
              <path d="M5.75 10.75L8 13L10.25 10.75" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10.25 5.25L8 3L5.75 5.25" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {name && <input type="hidden" name={name} value={currentValue != null ? String(currentValue) : ''} />}

        <AnimatePresence>
          {open && (
            <ListboxOptions listId={listId} buttonId={buttonId}>
              {options}
            </ListboxOptions>
          )}
        </AnimatePresence>
      </div>
    </ListboxContext.Provider>
  )
}

function ListboxOptions({ listId, buttonId, children }: { listId: string; buttonId: string; children: React.ReactNode }) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuRef.current) return
    const items = menuRef.current.querySelectorAll<HTMLElement>('[role="option"]')
    if (items.length > 0) items[0].focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const menu = menuRef.current
    if (!menu) return

    const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="option"]:not([data-disabled])'))
    const currentIndex = items.indexOf(document.activeElement as HTMLElement)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0
      items[next]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = currentIndex > 0 ? currentIndex - 1 : items.length - 1
      items[prev]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      items[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1]?.focus()
    }
  }

  return (
    <motion.div
      ref={menuRef}
      id={listId}
      role="listbox"
      aria-labelledby={buttonId}
      tabIndex={-1}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1, ease: 'easeOut' }}
      onKeyDown={handleKeyDown}
      className={clsx(
        // Anchor positioning
        'absolute left-0 top-full z-50 mt-1',
        // Base styles
        'isolate w-max min-w-full scroll-py-1 rounded-xl p-1 select-none',
        // Invisible border that is only visible in `forced-colors` mode for accessibility purposes
        'outline outline-transparent focus:outline-hidden',
        // Handle scrolling when menu won't fit in viewport
        'overflow-y-scroll overscroll-contain',
        // Popover background
        'bg-white/75 backdrop-blur-xl dark:bg-zinc-800/75',
        // Shadows
        'shadow-lg ring-1 ring-zinc-950/10 dark:ring-white/10 dark:ring-inset',
      )}
    >
      <SelectedOptionContext.Provider value={{ isSelectedOption: false }}>
        {children}
      </SelectedOptionContext.Provider>
    </motion.div>
  )
}

export function ListboxOption<T>({
  children,
  className,
  value,
  disabled,
  ...props
}: {
  className?: string
  children?: React.ReactNode
  value: T
  disabled?: boolean
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>) {
  const { value: selectedValue, onChange } = useContext(ListboxContext)
  const { isSelectedOption } = useContext(SelectedOptionContext)
  const selected = selectedValue === value

  let sharedClasses = clsx(
    // Base
    'flex min-w-0 items-center',
    // Icons
    '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0 sm:*:data-[slot=icon]:size-4',
    '*:data-[slot=icon]:text-zinc-500 group-data-focus/option:*:data-[slot=icon]:text-white dark:*:data-[slot=icon]:text-zinc-400',
    'forced-colors:*:data-[slot=icon]:text-[CanvasText] forced-colors:group-data-focus/option:*:data-[slot=icon]:text-[Canvas]',
    // Avatars
    '*:data-[slot=avatar]:-mx-0.5 *:data-[slot=avatar]:size-6 sm:*:data-[slot=avatar]:size-5',
  )

  // When used inside the button (selected option display), just render the content
  if (isSelectedOption) {
    if (!selected) return null
    return <span className={clsx(className, sharedClasses)}>{children}</span>
  }

  return (
    <div
      role="option"
      aria-selected={selected}
      data-selected={selected ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      tabIndex={-1}
      onClick={() => !disabled && onChange(value)}
      onMouseEnter={(e) => {
        e.currentTarget.setAttribute('data-focus', '')
        e.currentTarget.focus()
      }}
      onMouseLeave={(e) => e.currentTarget.removeAttribute('data-focus')}
      onFocus={(e) => e.currentTarget.setAttribute('data-focus', '')}
      onBlur={(e) => e.currentTarget.removeAttribute('data-focus')}
      className={clsx(
        // Basic layout
        'group/option grid cursor-default grid-cols-[--spacing(5)_1fr] items-baseline gap-x-2 rounded-lg py-2.5 pr-3.5 pl-2 sm:grid-cols-[--spacing(4)_1fr] sm:py-1.5 sm:pr-3 sm:pl-1.5',
        // Typography
        'text-base/6 text-zinc-950 sm:text-sm/6 dark:text-white forced-colors:text-[CanvasText]',
        // Focus
        'outline-hidden data-focus:bg-blue-500 data-focus:text-white',
        // Forced colors mode
        'forced-color-adjust-none forced-colors:data-focus:bg-[Highlight] forced-colors:data-focus:text-[HighlightText]',
        // Disabled
        'data-disabled:opacity-50',
      )}
      {...props}
    >
      <svg
        className="relative hidden size-5 self-center stroke-current group-data-selected/option:inline sm:size-4"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path d="M4 8.5l3 3L12 4" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={clsx(className, sharedClasses, 'col-start-2')}>{children}</span>
    </div>
  )
}

export function ListboxLabel({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
  return <span {...props} className={clsx(className, 'ml-2.5 truncate first:ml-0 sm:ml-2 sm:first:ml-0')} />
}

export function ListboxDescription({ className, children, ...props }: React.ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      {...props}
      className={clsx(
        className,
        'flex flex-1 overflow-hidden text-zinc-500 group-data-focus/option:text-white before:w-2 before:min-w-0 before:shrink dark:text-zinc-400',
      )}
    >
      <span className="flex-1 truncate">{children}</span>
    </span>
  )
}
