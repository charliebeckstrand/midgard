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
import { ConcentricProvider, useResolvedSize } from '../../primitives/concentric'
import { useJoin } from '../../primitives/join'
import { PopoverPanel } from '../../primitives/popover'
import { kokkaku } from '../../recipes'
import { comboboxVariants, k } from '../../recipes/kata/combobox'
import { popover as kPopover } from '../../recipes/kata/popover'
import { Button } from '../button'
import { type ControlSize, useControl } from '../control/context'
import { useGlass } from '../glass/context'
import { Headless } from '../headless'
import { Icon } from '../icon'
import { Input } from '../input'
import { Placeholder } from '../placeholder'
import { SelectTrigger } from '../select/select-trigger'
import { useSkeleton } from '../skeleton/context'
import { resolveInputDisplay } from './combobox-utilities'
import { useComboboxInput } from './use-combobox-input'
import { useComboboxState } from './use-combobox-state'

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
	/** Fires onValueChange without storing the value. */
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
	'data-group'?: string
	'data-group-orientation'?: string
	children: ReactNode | ((query: string) => ReactNode)
}

type ComboboxSingleProps<T> = {
	multiple?: false
	value?: T
	defaultValue?: T
	onValueChange?: (value: T | undefined) => void
}

type ComboboxMultipleProps<T> = {
	multiple: true
	value?: T[]
	defaultValue?: T[]
	onValueChange?: (value: T[]) => void
}

export type ComboboxProps<T> = ComboboxBaseProps<T> &
	(ComboboxSingleProps<T> | ComboboxMultipleProps<T>)

export function Combobox<T>({
	id,
	value: valueProp,
	defaultValue,
	displayValue,
	onValueChange,
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
	'data-group': dataGroup,
	'data-group-orientation': dataGroupOrientation,
	children,
}: ComboboxProps<T>) {
	const glass = useGlass()
	const control = useControl()
	const skeleton = useSkeleton()
	const join = useJoin()

	const resolvedSize = useResolvedSize(size)

	const resolvedDisabled = disabled ?? control?.disabled

	const handleValueChange = useCallback(
		(nextValue: T | T[] | undefined) => {
			if (nextValue === undefined && multiple) return

			;(onValueChange as ((value: T | T[] | undefined) => void) | undefined)?.(nextValue)
		},
		[onValueChange, multiple],
	)

	const [value, setValue] = useControllable<T | T[]>({
		value: valueProp,
		defaultValue: defaultValue as T | T[] | undefined,
		onChange: handleValueChange,
	})

	const comboboxId = useId()

	const inputRef = useRef<HTMLInputElement>(null)

	const optionsRef = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRoving(optionsRef, {
		itemSelector: '[role="option"]:not([data-disabled])',
		focusOnEmpty: true,
	})

	const keyboardSettled = useKeyboardSettled()

	const { query, setQuery, open, setOpen, editing, setEditing, close, select, flushPending } =
		useComboboxState<T>({
			multiple,
			nullable,
			selectable,
			closeOnSelect,
			open: openProp,
			inputRef,
			onOpenChange,
			onQueryChange,
			onValueChange: onValueChange as ((value: T) => void) | undefined,
			setValue,
		})

	const { refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange: setOpen,
		matchReferenceWidth: true,
	})

	const inputDisplay = resolveInputDisplay({ editing, query, value, displayValue, multiple })

	const inputHandlers = useComboboxInput<T>({
		multiple,
		clearOnEmpty,
		value,
		floatingRef: refs.floating,
		optionsRef,
		setValue,
		setEditing,
		setQuery,
		setOpen,
		close,
		keyboardSettled,
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

	const concentricValue = useMemo(() => ({ size: resolvedSize }), [resolvedSize])

	if (skeleton) {
		return (
			<Placeholder
				className={cn(
					kokkaku.formControl.base,
					join ? kokkaku.formControl.group[resolvedSize] : kokkaku.formControl.full,
					kokkaku.formControl.size[resolvedSize],
					className,
				)}
			/>
		)
	}

	return (
		<ComboboxProvider value={contextValue}>
			<SelectTrigger
				open={open}
				setReference={refs.setReference}
				getReferenceProps={getReferenceProps}
				glass={glass}
				size={resolvedSize}
				className={className}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
				prefix={prefix}
				suffix={suffix}
				suffixUnwrapped={
					!suffix ? (
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
					) : undefined
				}
			>
				<Headless>
					<Input
						id={id}
						ref={inputRef}
						type={inputType}
						role="combobox"
						aria-haspopup="listbox"
						aria-expanded={open}
						aria-controls={open ? comboboxId : undefined}
						aria-autocomplete="list"
						data-slot="combobox-input"
						autoComplete={autoComplete}
						disabled={resolvedDisabled}
						value={inputDisplay}
						placeholder={placeholder}
						className={cn(comboboxVariants({ size: resolvedSize }))}
						{...inputHandlers}
					/>
				</Headless>
			</SelectTrigger>

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
								<ConcentricProvider value={concentricValue}>
									<PopoverPanel
										id={comboboxId}
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
								</ConcentricProvider>
							</div>
						)}
					</AnimatePresence>
				</div>
			</FloatingPortal>
		</ComboboxProvider>
	)
}
