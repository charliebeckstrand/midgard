'use client'

import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useOverlay, useMenuKeyboard } from '../hooks'
import { popoverAnimation } from '../utils/motion'
import { popoverMenu } from '../utils/styles'
import { controlWrapper, controlInput } from '../utils'

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
	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLDivElement>(null)

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
			if (value === undefined) setInternalValue(newValue as T)
			onChange?.(newValue as T)
			close()
			inputRef.current?.focus()
		},
		[value, onChange, close],
	)

	const containerRef = useOverlay(open, close)
	const handleListKeyDown = useMenuKeyboard(listRef, '[role="option"]:not([data-disabled])')

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

	const anchorClasses = anchor === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'

	return (
		<ComboboxContext.Provider value={{ value: currentValue, onChange: handleChange, close }}>
			<div ref={containerRef} className="relative" {...props}>
				<span
					data-slot="control"
					className={clsx(className, controlWrapper)}
				>
					<input
						ref={inputRef}
						type="text"
						role="combobox"
						autoFocus={autoFocus}
						autoComplete="off"
						data-slot="control"
						aria-label={ariaLabel}
						aria-expanded={open}
						aria-autocomplete="list"
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
						className={clsx(
							'relative block w-full appearance-none rounded-lg py-[calc(--spacing(2.5)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
							'pr-[calc(--spacing(10)-1px)] pl-[calc(--spacing(3.5)-1px)] sm:pr-[calc(--spacing(9)-1px)] sm:pl-[calc(--spacing(3)-1px)]',
							controlInput,
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
						<svg
							className="size-5 stroke-zinc-500 group-disabled:stroke-zinc-600 group-hover:stroke-zinc-700 sm:size-4 dark:stroke-zinc-400 dark:group-hover:stroke-zinc-300 forced-colors:stroke-[CanvasText]"
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
							role="listbox"
							tabIndex={-1}
							{...popoverAnimation}
							onKeyDown={handleListKeyDown}
							className={clsx(
								`absolute left-0 z-50 ${anchorClasses}`,
								'empty:invisible',
								'scroll-py-1',
								popoverMenu,
								'overflow-y-scroll',
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

	const sharedClasses = clsx(
		'flex min-w-0 items-center',
		'*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0 sm:*:data-[slot=icon]:size-4',
		'*:data-[slot=icon]:text-zinc-500 group-focus/option:*:data-[slot=icon]:text-white dark:*:data-[slot=icon]:text-zinc-400',
		'forced-colors:*:data-[slot=icon]:text-[CanvasText] forced-colors:group-focus/option:*:data-[slot=icon]:text-[Canvas]',
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
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					if (!disabled) onChange(value)
				}
			}}
			className={clsx(
				'group/option grid w-full cursor-default grid-cols-[1fr_--spacing(5)] items-baseline gap-x-2 rounded-lg py-2.5 pr-2 pl-3.5 sm:grid-cols-[1fr_--spacing(4)] sm:py-1.5 sm:pr-2 sm:pl-3',
				'text-base/6 text-zinc-950 sm:text-sm/6 dark:text-white forced-colors:text-[CanvasText]',
				'outline-hidden focus:bg-blue-500 focus:text-white hover:bg-blue-500 hover:text-white',
				'forced-color-adjust-none forced-colors:focus:bg-[Highlight] forced-colors:focus:text-[HighlightText]',
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
				'flex flex-1 overflow-hidden text-zinc-500 group-focus/option:text-white before:w-2 before:min-w-0 before:shrink dark:text-zinc-400',
			)}
		>
			<span className="flex-1 truncate">{children}</span>
		</span>
	)
}
