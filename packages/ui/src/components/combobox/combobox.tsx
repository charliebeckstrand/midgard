'use client'

import { FloatingPortal, type Placement } from '@floating-ui/react'
import { ChevronsUpDown } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import {
	type InputHTMLAttributes,
	type ReactNode,
	useCallback,
	useId,
	useMemo,
	useRef,
} from 'react'
import { cn, createContext } from '../../core'
import { useFloatingUI, useRoving, useScrollWithin } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { useKeyboardSettled } from '../../hooks/use-keyboard-settled'
import { ControlFrame, PopoverPanel } from '../../primitives'
import { kokkaku } from '../../recipes'
import { k } from '../../recipes/kata/combobox'
import { popover as kPopover } from '../../recipes/kata/popover'
import { control as controlRecipe } from '../../recipes/waku/control'
import { Button } from '../button'
import { type ControlSize, useControl } from '../control/context'
import { useGlass } from '../glass/context'
import { Icon } from '../icon'
import { HeadlessInput } from '../input'
import { Placeholder } from '../placeholder'
import { useSkeleton } from '../skeleton/context'
import { useComboboxInputHandlers } from './use-combobox-input-handlers'
import { useComboboxSelection } from './use-combobox-selection'
import { resolveInputDisplay } from './utilities'

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
	prefix?: ReactNode
	suffix?: ReactNode
	size?: ControlSize
	disabled?: boolean
	className?: string
	inputType?: InputHTMLAttributes<HTMLInputElement>['type']
	autoComplete?: InputHTMLAttributes<HTMLInputElement>['autoComplete']
	/** Fires onChange without storing the value. */
	selectable?: boolean
	/** Clicking the selected option clears it. */
	nullable?: boolean
	/** Closes the menu on select. Defaults to true for single, false for multiple. */
	closeOnSelect?: boolean
	/** Clears the value when the user empties the input while editing. */
	clearOnEmpty?: boolean
	/** Controlled menu open state. */
	open?: boolean
	/** Fires when the menu open state changes. */
	onOpenChange?: (open: boolean) => void
	/** Fires when the input query changes. */
	onQueryChange?: (query: string) => void
	children: ReactNode | ((query: string) => ReactNode)
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
	prefix,
	suffix,
	size,
	disabled,
	selectable = true,
	nullable = valueProp === undefined && defaultValue === undefined,
	closeOnSelect,
	clearOnEmpty = false,
	open: openProp,
	onOpenChange,
	onQueryChange,
	className,
	autoComplete = 'off',
	inputType = 'text',
	children,
}: ComboboxProps<T>) {
	const glass = useGlass()
	const control = useControl()
	const skeleton = useSkeleton()

	const resolvedSize = size ?? control?.size ?? 'md'

	const resolvedDisabled = disabled ?? control?.disabled

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

	const handleKeyDown = useRoving(optionsRef, {
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
			open: openProp,
			onOpenChange,
			onQueryChange,
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

	const inputHandlers = useComboboxInputHandlers<T>({
		multiple,
		clearOnEmpty,
		value,
		setValue,
		setEditing,
		setQuery,
		setOpen,
		close,
		waitForKeyboard,
		floatingRef: refs.floating,
		optionsRef,
		rovingKeyDown: handleKeyDown,
	})

	const scrollWithin = useScrollWithin()

	const scrollToSelected = useCallback(
		(node: HTMLDivElement | null) => {
			if (!node) return

			const selected = node.querySelector<HTMLElement>('[role="option"][data-selected]')

			if (selected) scrollWithin(selected, { block: 'nearest' })
		},
		[scrollWithin],
	)

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
				<ControlFrame
					data-open={open || undefined}
					className={cn(!glass && controlRecipe.surface.default)}
				>
					{prefix && (
						<span data-slot="prefix" className={cn('peer/prefix', k.affix, k.prefix[resolvedSize])}>
							{prefix}
						</span>
					)}
					<HeadlessInput
						id={id}
						ref={inputRef}
						type={inputType}
						role="combobox"
						aria-haspopup="listbox"
						aria-expanded={open}
						aria-controls={open ? listboxId : undefined}
						aria-autocomplete="list"
						data-slot="combobox-input"
						autoComplete={autoComplete}
						disabled={resolvedDisabled}
						value={inputDisplay}
						placeholder={placeholder}
						className={cn(k.input)}
						{...inputHandlers}
					/>
					{suffix ? (
						<span data-slot="suffix" className={cn('peer/suffix', k.affix, k.suffix[resolvedSize])}>
							{suffix}
						</span>
					) : (
						<Button
							variant="ghost"
							tabIndex={-1}
							aria-label={open ? 'Close' : 'Open'}
							disabled={resolvedDisabled}
							className={cn(k.chevron)}
							onMouseDown={(e) => {
								e.preventDefault()

								if (open) {
									close()
								} else {
									inputRef.current?.focus()
									inputRef.current?.select()

									setOpen(true)
								}
							}}
						>
							<Icon icon={<ChevronsUpDown />} />
						</Button>
					)}
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
									glass={glass}
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
