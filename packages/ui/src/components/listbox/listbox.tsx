'use client'

import clsx from 'clsx'
import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { useCallback, useRef, useState } from 'react'
import { useControllable, useOverlay } from '../../hooks'
import { ChevronIcon } from '../../primitives'
import { ListboxProvider, SelectedOptionProvider } from './context'
import { ListboxOptions } from './options'

export type ListboxProps<T> = {
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
	inputId?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className' | 'onChange'>

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
	inputId,
	...props
}: ListboxProps<T>) {
	const [open, setOpen] = useState(false)
	const [currentValue, setValue] = useControllable({ value, defaultValue, onChange })
	const containerRef = useRef<HTMLDivElement>(null)
	const close = useCallback(() => setOpen(false), [])

	const handleChange = useCallback(
		(newValue: unknown) => {
			setValue(newValue as T)
			setOpen(false)
		},
		[setValue],
	)

	useOverlay(open, close)

	return (
		<ListboxProvider
			value={{ open, value: currentValue, onChange: handleChange, close, disabled, invalid }}
		>
			<div ref={containerRef} data-slot="control" className="relative" {...props}>
				<button
					type="button"
					id={inputId}
					// biome-ignore lint/a11y/noAutofocus: intentional autoFocus prop for listbox trigger
					autoFocus={autoFocus}
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
						'after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:ring-transparent after:ring-inset focus-visible:after:ring-2 focus-visible:after:ring-blue-600',
						'disabled:opacity-50 disabled:before:bg-zinc-950/5 disabled:before:shadow-none',
					])}
				>
					<span
						className={clsx([
							'relative block w-full appearance-none rounded-lg py-[calc(--spacing(2.5)-1px)] sm:py-[calc(--spacing(1.5)-1px)]',
							'min-h-11 sm:min-h-9',
							'pr-[calc(--spacing(7)-1px)] pl-[calc(--spacing(3.5)-1px)] sm:pl-[calc(--spacing(3)-1px)]',
							'text-left text-base/6 text-zinc-950 placeholder:text-zinc-500 dark:text-white forced-colors:text-[CanvasText]',
							'border border-zinc-950/10 group-active:border-zinc-950/20 group-hover:border-zinc-950/20 dark:border-white/10 dark:group-active:border-white/20 dark:group-hover:border-white/20',
							'bg-transparent dark:bg-white/5',
							'group-data-invalid:border-red-600 group-hover:group-data-invalid:border-red-600 dark:group-data-invalid:border-red-700 dark:hover:group-data-invalid:border-red-700',
							'group-disabled:border-zinc-950/20 group-disabled:opacity-100 dark:group-disabled:border-white/15 dark:group-disabled:bg-white/2.5 dark:group-disabled:hover:border-white/15',
						])}
					>
						<SelectedOptionProvider value={{ isSelectedOption: true }}>
							{currentValue !== undefined
								? options
								: placeholder && (
										<span className="block truncate text-zinc-500">{placeholder}</span>
									)}
						</SelectedOptionProvider>
					</span>
					<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
						<ChevronIcon className="group-disabled:stroke-zinc-600" />
					</span>
				</button>

				{name && (
					<input
						type="hidden"
						name={name}
						value={currentValue != null ? String(currentValue) : ''}
					/>
				)}

				<AnimatePresence>{open && <ListboxOptions>{options}</ListboxOptions>}</AnimatePresence>
			</div>
		</ListboxProvider>
	)
}
