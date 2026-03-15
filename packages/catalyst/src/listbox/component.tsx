'use client'

import clsx from 'clsx'
import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useOverlay, useMenuKeyboard } from '../hooks'
import { popoverAnimation } from '../utils/motion'
import { popoverMenu } from '../utils/styles'

interface ListboxContextValue {
	open: boolean
	value: unknown
	onChange: (value: unknown) => void
	close: () => void
	disabled?: boolean
	invalid?: boolean
}

const ListboxContext = createContext<ListboxContextValue>({
	open: false,
	value: undefined,
	onChange: () => {},
	close: () => {},
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

	const currentValue = value !== undefined ? value : internalValue
	const close = useCallback(() => setOpen(false), [])

	const handleChange = useCallback(
		(newValue: unknown) => {
			if (value === undefined) setInternalValue(newValue as T)
			onChange?.(newValue as T)
			setOpen(false)
		},
		[value, onChange],
	)

	useOverlay(open, close)

	return (
		<ListboxContext.Provider value={{ open, value: currentValue, onChange: handleChange, close, disabled, invalid }}>
			<div ref={containerRef} className="relative" {...props}>
				<button
					type="button"
					autoFocus={autoFocus}
					data-slot="control"
					aria-label={ariaLabel}
					aria-expanded={open}
					aria-haspopup="listbox"
					data-invalid={invalid ? '' : undefined}
					disabled={disabled}
					onClick={() => !disabled && setOpen((prev) => !prev)}
					className={clsx([
						className,
						'group relative block w-full',
						'before:absolute before:inset-px before:rounded-[calc(var(--radius-lg)-1px)] before:bg-white before:shadow-sm',
						'dark:before:hidden',
						'focus:outline-hidden',
						'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset focus-visible:after:ring-2 focus-visible:after:ring-blue-500',
						'disabled:opacity-50 disabled:before:bg-zinc-950/5 disabled:before:shadow-none',
					])}
				>
					<span
						className={clsx([
							'relative block w-full appearance-none rounded-lg py-[calc(--spacing(2.5)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
							'min-h-11 sm:min-h-9',
							'pr-[calc(--spacing(7)-1px)] pl-[calc(--spacing(3.5)-1px)] sm:pl-[calc(--spacing(3)-1px)]',
							'text-left text-base/6 text-zinc-950 placeholder:text-zinc-500 sm:text-sm/6 dark:text-white forced-colors:text-[CanvasText]',
							'border border-zinc-950/10 group-active:border-zinc-950/20 group-hover:border-zinc-950/20 dark:border-white/10 dark:group-active:border-white/20 dark:group-hover:border-white/20',
							'bg-transparent dark:bg-white/5',
							'group-data-invalid:border-red-500 group-hover:group-data-invalid:border-red-500 dark:group-data-invalid:border-red-600 dark:hover:group-data-invalid:border-red-600',
							'group-disabled:border-zinc-950/20 group-disabled:opacity-100 dark:group-disabled:border-white/15 dark:group-disabled:bg-white/2.5 dark:group-disabled:hover:border-white/15',
						])}
					>
						<SelectedOptionContext.Provider value={{ isSelectedOption: true }}>
							{currentValue !== undefined ? options : (placeholder && <span className="block truncate text-zinc-500">{placeholder}</span>)}
						</SelectedOptionContext.Provider>
					</span>
					<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
						<svg
							className="size-5 stroke-zinc-500 group-disabled:stroke-zinc-600 sm:size-4 dark:stroke-zinc-400 forced-colors:stroke-[CanvasText]"
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
						<ListboxOptions>
							{options}
						</ListboxOptions>
					)}
				</AnimatePresence>
			</div>
		</ListboxContext.Provider>
	)
}

function ListboxOptions({ children }: { children: React.ReactNode }) {
	const menuRef = useRef<HTMLDivElement>(null)
	const handleKeyDown = useMenuKeyboard(menuRef, '[role="option"]:not([data-disabled])')

	useEffect(() => {
		if (!menuRef.current) return
		const items = menuRef.current.querySelectorAll<HTMLElement>('[role="option"]')
		if (items.length > 0) items[0].focus()
	}, [])

	return (
		<motion.div
			ref={menuRef}
			role="listbox"
			tabIndex={-1}
			{...popoverAnimation}
			onKeyDown={handleKeyDown}
			className={clsx(
				'absolute left-0 top-full z-50 mt-1',
				'scroll-py-1',
				popoverMenu,
				'overflow-y-scroll',
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

	const sharedClasses = clsx(
		'flex min-w-0 items-center',
		'*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0 sm:*:data-[slot=icon]:size-4',
		'*:data-[slot=icon]:text-zinc-500 group-focus/option:*:data-[slot=icon]:text-white dark:*:data-[slot=icon]:text-zinc-400',
		'forced-colors:*:data-[slot=icon]:text-[CanvasText] forced-colors:group-focus/option:*:data-[slot=icon]:text-[Canvas]',
		'*:data-[slot=avatar]:-mx-0.5 *:data-[slot=avatar]:size-6 sm:*:data-[slot=avatar]:size-5',
	)

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
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					if (!disabled) onChange(value)
				}
			}}
			className={clsx(
				'group/option grid cursor-default grid-cols-[--spacing(5)_1fr] items-baseline gap-x-2 rounded-lg py-2.5 pr-3.5 pl-2 sm:grid-cols-[--spacing(4)_1fr] sm:py-1.5 sm:pr-3 sm:pl-1.5',
				'text-base/6 text-zinc-950 sm:text-sm/6 dark:text-white forced-colors:text-[CanvasText]',
				'outline-hidden focus:bg-blue-500 focus:text-white hover:bg-blue-500 hover:text-white',
				'forced-color-adjust-none forced-colors:focus:bg-[Highlight] forced-colors:focus:text-[HighlightText]',
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
				'flex flex-1 overflow-hidden text-zinc-500 group-focus/option:text-white before:w-2 before:min-w-0 before:shrink dark:text-zinc-400',
			)}
		>
			<span className="flex-1 truncate">{children}</span>
		</span>
	)
}
