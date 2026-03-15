'use client'

import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'

interface ComboboxContextValue {
  value: unknown
  onChange: (value: unknown) => void
  close: () => void
}

const ComboboxContext = createContext<ComboboxContextValue>({
  value: undefined,
  onChange: () => {},
  close: () => {},
})

export function Combobox<T>({
  options,
  displayValue,
  filter,
  anchor = 'bottom',
  className,
  placeholder,
  autoFocus,
  'aria-label': ariaLabel,
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  invalid,
  name,
  ...props
}: {
  options: T[]
  displayValue: (value: T | null) => string | undefined
  filter?: (value: T, query: string) => boolean
  className?: string
  placeholder?: string
  autoFocus?: boolean
  'aria-label'?: string
  children: (value: NonNullable<T>) => React.ReactElement
  value?: T
  defaultValue?: T
  onChange?: (value: T) => void
  disabled?: boolean
  invalid?: boolean
  name?: string
  anchor?: 'top' | 'bottom'
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'onChange'>) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const inputId = useId()

  const currentValue = value !== undefined ? value : internalValue

  const filteredOptions =
    query === ''
      ? options
      : options.filter((option) =>
          filter ? filter(option, query) : displayValue(option)?.toLowerCase().includes(query.toLowerCase()),
        )

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
  }, [])

  const handleChange = useCallback(
    (newValue: unknown) => {
      if (value === undefined) {
        setInternalValue(newValue as T)
      }
      onChange?.(newValue as T)
      close()
      inputRef.current?.focus()
    },
    [value, onChange, close],
  )

  useEffect(() => {
    if (!open) return

    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close()
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, close])

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
      } else if (listRef.current) {
        const items = listRef.current.querySelectorAll<HTMLElement>('[role="option"]')
        if (items.length > 0) items[0].focus()
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
      } else if (listRef.current) {
        const items = listRef.current.querySelectorAll<HTMLElement>('[role="option"]')
        if (items.length > 0) items[items.length - 1].focus()
      }
    }
  }

  function handleListKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const list = listRef.current
    if (!list) return

    const items = Array.from(list.querySelectorAll<HTMLElement>('[role="option"]:not([data-disabled])'))
    const currentIndex = items.indexOf(document.activeElement as HTMLElement)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = currentIndex < items.length - 1 ? currentIndex + 1 : 0
      items[next]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (currentIndex <= 0) {
        inputRef.current?.focus()
      } else {
        items[currentIndex - 1]?.focus()
      }
    } else if (e.key === 'Home') {
      e.preventDefault()
      inputRef.current?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      items[items.length - 1]?.focus()
    }
  }

  const anchorClasses = anchor === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'

  return (
    <ComboboxContext.Provider value={{ value: currentValue, onChange: handleChange, close }}>
      <div ref={containerRef} className="relative" {...props}>
        <span
          data-slot="control"
          className={clsx([
            className,
            // Basic layout
            'relative block w-full',
            // Background color + shadow applied to inset pseudo element, so shadow blends with border in light mode
            'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-white before:shadow-sm',
            // Background color is moved to control and shadow is removed in dark mode so hide `before` pseudo
            'dark:before:hidden',
            // Focus ring
            'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset sm:focus-within:after:ring-2 sm:focus-within:after:ring-blue-500',
            // Disabled state
            'has-data-disabled:opacity-50 has-data-disabled:before:bg-zinc-950/5 has-data-disabled:before:shadow-none',
            // Invalid state
            'has-data-invalid:before:shadow-red-500/10',
          ])}
        >
          <input
            ref={inputRef}
            type="text"
            id={inputId}
            role="combobox"
            autoFocus={autoFocus}
            autoComplete="off"
            data-slot="control"
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-controls={open ? listId : undefined}
            aria-autocomplete="list"
            data-disabled={disabled ? '' : undefined}
            data-invalid={invalid ? '' : undefined}
            disabled={disabled}
            placeholder={placeholder}
            value={query || (open ? '' : displayValue(currentValue as T) ?? '')}
            onChange={(e) => {
              setQuery(e.target.value)
              if (!open) setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleInputKeyDown}
            className={clsx([
              // Basic layout
              'relative block w-full appearance-none rounded-lg py-[calc(--spacing(2.5)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
              // Horizontal padding
              'pr-[calc(--spacing(10)-1px)] pl-[calc(--spacing(3.5)-1px)] sm:pr-[calc(--spacing(9)-1px)] sm:pl-[calc(--spacing(3)-1px)]',
              // Typography
              'text-base/6 text-zinc-950 placeholder:text-zinc-500 sm:text-sm/6 dark:text-white',
              // Border
              'border border-zinc-950/10 data-hover:border-zinc-950/20 dark:border-white/10 dark:data-hover:border-white/20',
              // Background color
              'bg-transparent dark:bg-white/5',
              // Hide default focus styles
              'focus:outline-hidden',
              // Invalid state
              'data-invalid:border-red-500 data-invalid:data-hover:border-red-500 dark:data-invalid:border-red-500 dark:data-invalid:data-hover:border-red-500',
              // Disabled state
              'data-disabled:border-zinc-950/20 dark:data-disabled:border-white/15 dark:data-disabled:bg-white/2.5 dark:data-hover:data-disabled:border-white/15',
              // System icons
              'dark:scheme-dark',
            ])}
          />
          <button
            type="button"
            tabIndex={-1}
            className="group absolute inset-y-0 right-0 flex items-center px-2"
            data-disabled={disabled ? '' : undefined}
            onClick={() => {
              if (disabled) return
              setOpen((prev) => !prev)
              inputRef.current?.focus()
            }}
            onMouseEnter={(e) => e.currentTarget.setAttribute('data-hover', '')}
            onMouseLeave={(e) => e.currentTarget.removeAttribute('data-hover')}
          >
            <svg
              className="size-5 stroke-zinc-500 group-data-disabled:stroke-zinc-600 group-data-hover:stroke-zinc-700 sm:size-4 dark:stroke-zinc-400 dark:group-data-hover:stroke-zinc-300 forced-colors:stroke-[CanvasText]"
              viewBox="0 0 16 16"
              aria-hidden="true"
              fill="none"
            >
              <path d="M5.75 10.75L8 13L10.25 10.75" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10.25 5.25L8 3L5.75 5.25" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </span>

        {name && <input type="hidden" name={name} value={currentValue != null ? String(currentValue) : ''} />}

        <AnimatePresence>
          {open && filteredOptions.length > 0 && (
            <motion.div
              ref={listRef}
              id={listId}
              role="listbox"
              aria-labelledby={inputId}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1, ease: 'easeOut' }}
              onKeyDown={handleListKeyDown}
              className={clsx(
                // Anchor positioning
                `absolute left-0 z-50 ${anchorClasses}`,
                // Base styles,
                'isolate min-w-full scroll-py-1 rounded-xl p-1 select-none empty:invisible',
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
              {filteredOptions.map((option) => children(option as NonNullable<T>))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ComboboxContext.Provider>
  )
}

export function ComboboxOption<T>({
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
  const { value: selectedValue, onChange } = useContext(ComboboxContext)
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
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (!disabled) onChange(value)
        }
      }}
      className={clsx(
        // Basic layout
        'group/option grid w-full cursor-default grid-cols-[1fr_--spacing(5)] items-baseline gap-x-2 rounded-lg py-2.5 pr-2 pl-3.5 sm:grid-cols-[1fr_--spacing(4)] sm:py-1.5 sm:pr-2 sm:pl-3',
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
      <span className={clsx(className, sharedClasses)}>{children}</span>
      <svg
        className="relative col-start-2 hidden size-5 self-center stroke-current group-data-selected/option:inline sm:size-4"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <path d="M4 8.5l3 3L12 4" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export function ComboboxLabel({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
  return <span {...props} className={clsx(className, 'ml-2.5 truncate first:ml-0 sm:ml-2 sm:first:ml-0')} />
}

export function ComboboxDescription({ className, children, ...props }: React.ComponentPropsWithoutRef<'span'>) {
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
