'use client'

import { FloatingPortal, type Placement } from '@floating-ui/react'
import { ChevronsUpDown } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { useCallback, useId, useMemo, useRef } from 'react'
import { cn, createContext } from '../../core'
import { useFloatingUI } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { useRovingFocus } from '../../hooks/use-keyboard'
import { useKeyboardSettled } from '../../hooks/use-keyboard-settled'
import { ControlFrame, PopoverPanel } from '../../primitives'
import { kokkaku, waku } from '../../recipes'
import { useControl } from '../control/context'
import { useGlass } from '../glass/context'
import { Icon } from '../icon'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { useComboboxSelection } from './use-combobox-selection'
import { resolveInputDisplay, selectActiveOrSingleOption } from './utilities'
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
	id?: string
	placeholder?: string
	displayValue?: (value: T) => string
	placement?: Placement
	icon?: React.ReactNode
	className?: string
	/** Fires onChange without storing the value. */
	selectable?: boolean
	/** Clicking the selected option clears it. */
	nullable?: boolean
	/** Closes the menu on select. Defaults to true for single, false for multiple. */
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
	id,
	value: valueProp,
	defaultValue,
	displayValue,
	onChange,
	multiple = false,
	placeholder = 'Search',
	placement = 'bottom-start',
	icon,
	selectable = true,
	nullable = valueProp === undefined && defaultValue === undefined,
	closeOnSelect,
	className,
	children,
}: ComboboxProps<T>) {
	const glass = useGlass()
	const control = useControl()
	const skeleton = useSkeleton()

	const resolvedDisabled = control?.disabled

	const resolvedSize = control?.size ?? 'md'

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

	const listboxId = useId()

	const inputRef = useRef<HTMLInputElement>(null)

	const optionsRef = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRovingFocus(optionsRef, {
		itemSelector: '[role="option"]:not([data-disabled])',
		focusOnEmpty: true,
	})

	const waitForKeyboard = useKeyboardSettled()

	const { query, setQuery, open, setOpen, editing, setEditing, close, select, flushPending } =
		useComboboxSelection<T>({
			multiple,
			nullable,
			selectable,
			closeOnSelect,
			onChange: onChange as ((value: T) => void) | undefined,
			setValue,
			inputRef,
		})

	const { refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange: setOpen,
		matchReferenceWidth: true,
	})

	const inputDisplay = resolveInputDisplay({ editing, query, value, displayValue, multiple })

	const scrollToSelected = useCallback((node: HTMLDivElement | null) => {
		if (!node) return

		const selected = node.querySelector<HTMLElement>('[role="option"][data-selected]')

		selected?.scrollIntoView({ block: 'center' })
	}, [])

	const rendered = typeof children === 'function' ? children(query) : children

	const contextValue = useMemo<ComboboxContextValue>(
		() => ({ value, multiple, select: select as (v: unknown) => void, query }),
		[value, multiple, select, query],
	)

	if (skeleton) {
		return (
			<Placeholder
				className={cn(kokkaku.formControl.base, kokkaku.formControl.size[resolvedSize], className)}
			/>
		)
	}

	return (
		<ComboboxProvider value={contextValue}>
			<div
				data-slot="control"
				ref={refs.setReference}
				className={cn(className)}
				{...getReferenceProps()}
			>
				<ControlFrame data-open={open || undefined} className={cn(!glass && waku.control.surface)}>
					<input
						ref={inputRef}
						type="text"
						role="combobox"
						aria-haspopup="listbox"
						aria-expanded={open}
						aria-controls={open ? listboxId : undefined}
						aria-autocomplete="list"
						data-slot="combobox-input"
						id={id ?? control?.id}
						disabled={resolvedDisabled}
						{...(control?.invalid ? { 'data-invalid': '', 'aria-invalid': true } : {})}
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

								if (container && selectActiveOrSingleOption(container)) {
									e.preventDefault()

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
				</ControlFrame>
			</div>

			<FloatingPortal>
				<div ref={optionsRef}>
					<AnimatePresence onExitComplete={flushPending}>
						{open && (
							<div
								ref={(node) => {
									refs.setFloating(node)

									scrollToSelected(node)
								}}
								data-editing={editing || undefined}
								style={floatingStyles}
								className={cn('group/combobox', kPopover.portal)}
								{...getFloatingProps()}
							>
								<PopoverPanel
									id={listboxId}
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
