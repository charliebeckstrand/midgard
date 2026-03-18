'use client'

import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { useCallback, useRef, useState } from 'react'
import { cn } from '../../core'
import { useControllable, useOverlay } from '../../hooks'
import { ChevronIcon } from '../../primitives'
import { omote } from '../../recipes'
import { ComboboxProvider } from './context'
import { ComboboxOptions } from './options'

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
	inputId,
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
	inputId?: string
	anchor?: 'top' | 'bottom'
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'onChange' | 'children'>) {
	const [query, setQuery] = useState('')
	const [open, setOpen] = useState(false)
	const [currentValue, setValue] = useControllable({ value, defaultValue, onChange })
	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLDivElement>(null)

	const filteredOptions =
		query === ''
			? options
			: options.filter((option) =>
					filter
						? filter(option, query)
						: displayValue(option)?.toLowerCase().includes(query.toLowerCase()),
				)

	const close = useCallback(() => {
		setOpen(false)
		setQuery('')
	}, [])

	const handleChange = useCallback(
		(newValue: unknown) => {
			setValue(newValue as T)
			close()
			inputRef.current?.focus()
		},
		[setValue, close],
	)

	const containerRef = useOverlay(open, close)
	const anchorClasses = anchor === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'

	function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'ArrowDown') {
			e.preventDefault()
			if (!open) {
				setOpen(true)
			} else if (listRef.current) {
				const items = listRef.current.querySelectorAll<HTMLElement>('[role="option"]')
				if (items.length > 0) items[0]?.focus()
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault()
			if (!open) {
				setOpen(true)
			} else if (listRef.current) {
				const items = listRef.current.querySelectorAll<HTMLElement>('[role="option"]')
				if (items.length > 0) items[items.length - 1]?.focus()
			}
		}
	}

	return (
		<ComboboxProvider value={{ value: currentValue, onChange: handleChange, close }}>
			<div ref={containerRef} data-slot="control" className="relative" {...props}>
				<span className={cn(omote.control, className)}>
					<input
						ref={inputRef}
						id={inputId}
						type="text"
						role="combobox"
						// biome-ignore lint/a11y/noAutofocus: intentional autoFocus prop for combobox
						autoFocus={autoFocus}
						autoComplete="off"
						data-slot="control"
						aria-label={ariaLabel}
						aria-expanded={open}
						aria-autocomplete="list"
						data-invalid={invalid ? '' : undefined}
						disabled={disabled}
						placeholder={placeholder}
						value={query || (open ? '' : (displayValue(currentValue as T) ?? ''))}
						onChange={(e) => {
							setQuery(e.target.value)
							if (!open) setOpen(true)
						}}
						onFocus={() => setOpen(true)}
						onKeyDown={handleInputKeyDown}
						className={cn(
							'relative block w-full appearance-none rounded-lg py-[calc(--spacing(2.5)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
							'pr-[calc(--spacing(10)-1px)] pl-[calc(--spacing(3.5)-1px)] sm:pr-[calc(--spacing(9)-1px)] sm:pl-[calc(--spacing(3)-1px)]',
							omote.input,
							'dark:scheme-dark',
						)}
					/>
					<button
						type="button"
						tabIndex={-1}
						className="group absolute inset-y-0 right-0 flex items-center px-2"
						disabled={disabled}
						onClick={() => {
							if (disabled) return
							setOpen((prev) => !prev)
							inputRef.current?.focus()
						}}
					>
						<ChevronIcon className="group-disabled:stroke-zinc-600 group-hover:stroke-zinc-700 dark:group-hover:stroke-zinc-300" />
					</button>
				</span>

				{name && (
					<input
						type="hidden"
						name={name}
						value={currentValue != null ? String(currentValue) : ''}
					/>
				)}

				<AnimatePresence>
					{open && filteredOptions.length > 0 && (
						<ComboboxOptions ref={listRef} className={`left-0 ${anchorClasses}`}>
							{filteredOptions.map((option) => children(option as NonNullable<T>))}
						</ComboboxOptions>
					)}
				</AnimatePresence>
			</div>
		</ComboboxProvider>
	)
}
