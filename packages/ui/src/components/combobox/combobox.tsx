'use client'

import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn, createContext } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { useMenuKeyboard } from '../../hooks/use-menu-keyboard'
import { useOverlay } from '../../hooks/use-overlay'
import { FormControl, PopoverPanel } from '../../primitives'
import { katachi, narabi, sumi } from '../../recipes'
import { Icon } from '../icon'

const k = katachi.combobox

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
	icon?: React.ReactNode
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
	placeholder = 'Search',
	displayValue,
	anchor = 'bottom start',
	icon,
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
	const pendingValue = useRef<T | T[] | undefined>(undefined)

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
			} else if (shouldClose) {
				pendingValue.current = newValue
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

	const onExitComplete = useCallback(() => {
		if (pendingValue.current !== undefined) {
			setValue(pendingValue.current)

			pendingValue.current = undefined
		}
	}, [setValue])

	const inputDisplay = useMemo(() => {
		if (editing) return query

		if (!multiple && value !== undefined && displayValue) return displayValue(value as T)

		return ''
	}, [editing, query, value, displayValue, multiple])

	const containerRef = useOverlay(open, close)

	const rendered = typeof children === 'function' ? children(query) : children

	// Mark the sole visible option as active so it highlights without stealing focus
	// Derive a key from rendered children so the effect re-runs as the list filters
	const childCount = Array.isArray(rendered) ? rendered.length : rendered ? 1 : 0

	useEffect(() => {
		if (!editing || !open || !childCount) return

		const container = optionsRef.current

		if (!container) return

		// Clear any previous active marker
		for (const el of container.querySelectorAll('[data-active]')) el.removeAttribute('data-active')

		const items = container.querySelectorAll<HTMLElement>('[role="option"]:not([data-disabled])')

		if (items.length === 1) items[0]?.setAttribute('data-active', '')
	}, [editing, open, childCount])

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
							if (e.key === 'Enter') {
								const container = optionsRef.current
								const active = container?.querySelector<HTMLElement>('[data-active]')

								if (active) {
									e.preventDefault()

									active.click()

									return
								}

								// If there's exactly one visible option, select it
								const items = container?.querySelectorAll<HTMLElement>(
									'[role="option"]:not([data-disabled])',
								)

								if (items?.length === 1) {
									e.preventDefault()

									items[0]?.click()

									return
								}
							}
							handleKeyDown(e)
						}}
						className={cn(k.input)}
					/>
					<button
						type="button"
						tabIndex={-1}
						inert={open || undefined}
						onClick={() => setOpen(!open)}
						className={cn(k.chevron)}
					>
						{icon ?? <Icon name="chevron-up-down" />}
					</button>
				</FormControl>

				<div ref={optionsRef}>
					<AnimatePresence onExitComplete={onExitComplete}>
						{open && (
							<PopoverPanel
								role="listbox"
								autoFocus={false}
								className={cn(narabi.anchor[anchor], k.options)}
								onKeyDown={(e) => {
									if (e.key === 'Escape') close()
								}}
							>
								{rendered}
								<output className={cn('hidden p-2 text-sm only:block', sumi.textMuted)}>
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
