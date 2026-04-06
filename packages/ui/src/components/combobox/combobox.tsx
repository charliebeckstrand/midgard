'use client'

import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { cn, createContext } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { useMenuKeyboard } from '../../hooks/use-menu-keyboard'
import { useOverlay } from '../../hooks/use-overlay'
import { ChevronIcon, FormControl, PopoverPanel } from '../../primitives'
import { narabi, sumi } from '../../recipes'
import { comboboxChevronVariants, comboboxInputVariants, comboboxOptionsVariants } from './variants'

type ComboboxContextValue<T = unknown> = {
	value: T | T[] | undefined
	multiple: boolean
	select: (value: T) => void
	query: string
}

export const [ComboboxProvider, useComboboxContext] =
	createContext<ComboboxContextValue>('Combobox')

type ComboboxBaseProps<T> = {
	placeholder?: string
	displayValue?: (value: T) => string
	anchor?: keyof typeof narabi.anchor
	className?: string
	/** When false, onChange still fires but the value is never stored or shown as selected. */
	selectable?: boolean
	/** Whether the menu closes after an option is selected. Defaults to true for single, false for multiple. */
	closeOnSelect?: boolean
	children: React.ReactNode | ((query: string) => React.ReactNode)
}

export type ComboboxProps<T> = ComboboxBaseProps<T> &
	(
		| {
				multiple?: false
				value?: T
				defaultValue?: T
				onChange?: (value: T) => void
		  }
		| {
				multiple: true
				value?: T[]
				defaultValue?: T[]
				onChange?: (value: T[]) => void
		  }
	)

export function Combobox<T>({
	value: valueProp,
	defaultValue,
	onChange,
	multiple = false,
	placeholder = 'Search...',
	displayValue,
	anchor = 'bottom start',
	selectable = true,
	closeOnSelect,
	className,
	children,
}: ComboboxProps<T>) {
	const [value, setValue] = useControllable<T | T[]>({
		value: valueProp,
		defaultValue: defaultValue as T | T[] | undefined,
		onChange: onChange as ((value: T | T[]) => void) | undefined,
	})

	const [query, setQuery] = useState('')
	const [open, setOpen] = useState(false)
	const [editing, setEditing] = useState(false)

	const inputRef = useRef<HTMLInputElement>(null)
	const optionsRef = useRef<HTMLDivElement>(null)

	const handleKeyDown = useMenuKeyboard(optionsRef, '[role="option"]:not([data-disabled])')

	const close = useCallback(() => {
		setOpen(false)
		setQuery('')

		setEditing(false)
	}, [])

	const shouldClose = closeOnSelect ?? !multiple

	const select = useCallback(
		(newValue: T) => {
			if (!selectable) {
				;(onChange as ((value: T) => void) | undefined)?.(newValue)
			} else if (multiple) {
				const arr = (Array.isArray(value) ? value : []) as T[]

				const next = arr.includes(newValue) ? arr.filter((v) => v !== newValue) : [...arr, newValue]

				setValue(next)
			} else {
				setValue(newValue)
			}

			if (shouldClose) {
				close()
			} else {
				setQuery('')
				setEditing(false)
				inputRef.current?.focus()
			}
		},
		[multiple, selectable, shouldClose, value, setValue, onChange, close],
	)

	const inputDisplay = useMemo(() => {
		if (editing) return query

		if (!multiple && value !== undefined && displayValue) return displayValue(value as T)

		return ''
	}, [editing, query, value, displayValue, multiple])

	const containerRef = useOverlay(open, close)

	const rendered = typeof children === 'function' ? children(query) : children

	return (
		<ComboboxProvider value={{ value, multiple, select: select as (v: unknown) => void, query }}>
			<div ref={containerRef} data-slot="control" className={cn('relative', className)}>
				<FormControl data-open={open || undefined}>
					<input
						ref={inputRef}
						type="text"
						role="combobox"
						aria-haspopup="listbox"
						aria-expanded={open}
						aria-autocomplete="list"
						data-slot="combobox-input"
						value={inputDisplay}
						placeholder={placeholder}
						onChange={(e) => {
							setEditing(true)

							setQuery(e.target.value)
							setOpen(true)
						}}
						onFocus={() => setOpen(true)}
						onKeyDown={(e) => {
							if (e.key === 'Escape') {
								close()

								return
							}
							handleKeyDown(e)
						}}
						className={cn(comboboxInputVariants())}
					/>
					<button
						type="button"
						tabIndex={-1}
						inert={open || undefined}
						onClick={() => setOpen(!open)}
						className={comboboxChevronVariants()}
					>
						<ChevronIcon />
					</button>
				</FormControl>

				<div ref={optionsRef}>
					<AnimatePresence>
						{open && (
							<PopoverPanel
								role="listbox"
								autoFocus={false}
								className={cn(narabi.anchor[anchor], comboboxOptionsVariants())}
								onKeyDown={(e) => {
									if (e.key === 'Escape') close()
								}}
							>
								{rendered}
								<output className={cn('hidden text-sm p-2 only:block', sumi.textMuted)}>
									No results
								</output>
							</PopoverPanel>
						)}
					</AnimatePresence>
				</div>
			</div>
		</ComboboxProvider>
	)
}
