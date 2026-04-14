'use client'

import {
	autoUpdate,
	FloatingPortal,
	flip,
	offset,
	type Placement,
	shift,
	size,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import { ChevronsUpDown } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn, createContext } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { useRovingFocus } from '../../hooks/use-keyboard'
import { useSelect } from '../../hooks/use-select'
import { useVirtualKeyboardStable } from '../../hooks/use-virtual-keyboard-stable'
import { FormControl, PopoverPanel } from '../../primitives'
import { Icon } from '../icon'
import { k, kPopover } from './variants'

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
	placement?: Placement
	icon?: React.ReactNode
	className?: string
	/** When false, onChange still fires but the value is never stored or shown as selected. */
	selectable?: boolean
	/** When true, clicking the selected option again clears the selection. */
	nullable?: boolean
	/** Whether the menu closes after an option is selected. Defaults to true for single, false for multiple. */
	closeOnSelect?: boolean
	children: React.ReactNode | ((query: string) => React.ReactNode)
}

type ComboboxSingleProps<T> = {
	multiple?: false
	value?: T
	defaultValue?: T
	onChange?: (value: T | undefined) => void
}

type ComboboxMultipleProps<T> = {
	multiple: true
	value?: T[]
	defaultValue?: T[]
	onChange?: (value: T[]) => void
}

export type ComboboxProps<T> = ComboboxBaseProps<T> &
	(ComboboxSingleProps<T> | ComboboxMultipleProps<T>)

export function Combobox<T>({
	value: valueProp,
	defaultValue,
	displayValue,
	onChange,
	multiple = false,
	placeholder = 'Search',
	placement = 'bottom-start',
	icon,
	selectable = true,
	nullable = false,
	closeOnSelect,
	className,
	children,
}: ComboboxProps<T>) {
	const handleValueChange = useCallback(
		(nextValue: T | T[] | undefined) => {
			if (nextValue === undefined && multiple) return

			;(onChange as ((value: T | T[] | undefined) => void) | undefined)?.(nextValue)
		},
		[onChange, multiple],
	)

	const [value, setValue] = useControllable<T | T[]>({
		value: valueProp,
		defaultValue: defaultValue as T | T[] | undefined,
		onChange: handleValueChange,
	})

	const [query, setQuery] = useState('')
	const [open, setOpen] = useState(false)
	const [editing, setEditing] = useState(false)

	const inputRef = useRef<HTMLInputElement>(null)
	const optionsRef = useRef<HTMLDivElement>(null)
	const handleKeyDown = useRovingFocus(optionsRef, {
		itemSelector: '[role="option"]:not([data-disabled])',
		focusOnEmpty: true,
	})

	const waitForKeyboard = useVirtualKeyboardStable()

	const { refs, floatingStyles, context } = useFloating({
		placement,
		open,
		onOpenChange: setOpen,
		whileElementsMounted: autoUpdate,
		middleware: [
			offset(4),
			flip(),
			shift({ padding: 8 }),
			size({
				apply({ rects, elements }) {
					Object.assign(elements.floating.style, {
						minWidth: `${rects.reference.width}px`,
					})
				},
			}),
		],
	})

	const dismiss = useDismiss(context)
	const role = useRole(context, { role: 'listbox' })

	const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role])

	const close = useCallback(() => {
		setOpen(false)

		setQuery('')

		setEditing(false)
	}, [])

	const shouldClose = closeOnSelect ?? !multiple

	const toggle = useSelect({ multiple, nullable, setValue })

	const pendingRef = useRef<{ value: T } | null>(null)

	const select = useCallback(
		(newValue: T) => {
			if (!selectable) {
				;(onChange as ((value: T) => void) | undefined)?.(newValue)
			} else if (shouldClose) {
				pendingRef.current = { value: newValue }
			} else {
				toggle(newValue)
			}

			if (shouldClose) {
				close()
			} else {
				setQuery('')
				setEditing(false)

				inputRef.current?.focus()
			}
		},
		[selectable, shouldClose, toggle, onChange, close],
	)

	const flushPending = useCallback(() => {
		if (pendingRef.current) {
			toggle(pendingRef.current.value)

			pendingRef.current = null
		}
	}, [toggle])

	const inputDisplay = useMemo(() => {
		if (editing) return query

		if (!multiple && value !== undefined && displayValue) return displayValue(value as T)

		return ''
	}, [editing, query, value, displayValue, multiple])

	const rendered = typeof children === 'function' ? children(query) : children

	// Mark the active option so it highlights without stealing focus from the input.
	// Derive a key from rendered children so the effect re-runs as the list filters.
	const childCount = Array.isArray(rendered) ? rendered.length : rendered ? 1 : 0

	useEffect(() => {
		if (!open || !childCount) return

		const container = optionsRef.current

		if (!container) return

		// Clear any previous active marker
		for (const el of container.querySelectorAll('[data-active]')) el.removeAttribute('data-active')

		if (editing) {
			// During search, highlight the sole visible option so Enter can select it
			const items = container.querySelectorAll<HTMLElement>('[role="option"]:not([data-disabled])')

			if (items.length === 1) items[0]?.setAttribute('data-active', '')
		} else {
			// On open, highlight the currently selected option (if any)
			const selected = container.querySelector<HTMLElement>(
				'[role="option"]:not([data-disabled])[data-selected]',
			)

			if (selected) {
				selected.setAttribute('data-active', '')

				selected.scrollIntoView({ block: 'center' })
			}
		}
	}, [editing, open, childCount])

	return (
		<ComboboxProvider value={{ value, multiple, select: select as (v: unknown) => void, query }}>
			<div
				data-slot="control"
				ref={refs.setReference}
				className={cn(className)}
				{...getReferenceProps()}
			>
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
						onFocus={() => waitForKeyboard(() => setOpen(true))}
						onBlur={(e) => {
							// Check if focus moved to the floating panel
							const floating = refs.floating.current

							if (floating?.contains(e.relatedTarget as Node)) return

							close()
						}}
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
					<span data-slot="icon" className={cn(k.chevron)}>
						{icon ?? <Icon icon={<ChevronsUpDown />} size="sm" />}
					</span>
				</FormControl>
			</div>

			<FloatingPortal>
				<div ref={optionsRef}>
					<AnimatePresence onExitComplete={flushPending}>
						{open && (
							<div
								ref={refs.setFloating}
								style={floatingStyles}
								className={kPopover.portal}
								{...getFloatingProps()}
							>
								<PopoverPanel
									role="listbox"
									autoFocus={false}
									className={cn('relative', k.options)}
									onKeyDown={(e) => {
										if (e.key === 'Escape') close()
									}}
								>
									{rendered}
									<output className={cn(k.empty)}>No results</output>
								</PopoverPanel>
							</div>
						)}
					</AnimatePresence>
				</div>
			</FloatingPortal>
		</ComboboxProvider>
	)
}
