'use client'

import type { Placement } from '@floating-ui/react'
import { ChevronsUpDown, X } from 'lucide-react'
import {
	type InputHTMLAttributes,
	type ReactNode,
	useCallback,
	useId,
	useMemo,
	useRef,
} from 'react'
import { useFloatingUI, useRoving, useScrollWithin, useSelectableValueChange } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { useKeyboardSettled } from '../../hooks/use-keyboard-settled'
import { densityPresets, useDensity } from '../../primitives/density'
import { SelectTrigger } from '../../primitives/select-trigger'
import { useSkeleton } from '../../providers/skeleton'
import { Button } from '../button'
import { type ControlSize, useControl } from '../control/context'
import { ControlSkeleton } from '../control/control-skeleton'
import { useGlass } from '../glass/context'
import { Icon } from '../icon'
import { OPTION_SELECTOR } from './combobox-constants'
import { ComboboxInput } from './combobox-input'
import { ComboboxPanel } from './combobox-panel'
import { resolveInputDisplay } from './combobox-utilities'
import { ComboboxContext } from './context'
import { useComboboxInput } from './use-combobox-input'
import { useComboboxState } from './use-combobox-state'
import { useComboboxTrigger } from './use-combobox-trigger'

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
	/** Show a clear button in place of the chevron when a value is selected. */
	clearable?: boolean
	/** Controlled menu open state. */
	open?: boolean
	/** Fires when the menu open state changes. */
	onOpenChange?: (open: boolean) => void
	/** Fires when the input query changes. */
	onQueryChange?: (query: string) => void
	'data-group'?: string
	'data-group-orientation'?: string
	/** Root slot identifier. Wrappers override it to stamp their own name. */
	'data-slot'?: string
	/**
	 * Items to render inside the panel. Pass a function to receive the live
	 * query and a deferred copy; filter heavy lists against `deferredQuery` to
	 * keep typing responsive.
	 */
	children: ReactNode | ((query: string, deferredQuery: string) => ReactNode)
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
	clearable = false,
	open: openProp,
	onOpenChange,
	onQueryChange,
	className,
	autoComplete = 'off',
	inputType = 'text',
	'data-group': dataGroup,
	'data-group-orientation': dataGroupOrientation,
	'data-slot': slot = 'combobox',
	children,
}: ComboboxProps<T>) {
	const glass = useGlass()
	const control = useControl()
	const skeleton = useSkeleton()
	const inherited = useDensity()

	const token = size ? densityPresets[size] : inherited

	const resolvedSize = token.size

	const resolvedDisabled = disabled ?? control?.disabled

	const handleValueChange = useSelectableValueChange<T>(
		onValueChange as ((value: T | T[] | undefined) => void) | undefined,
		multiple,
	)

	const [value, setValue] = useControllable<T | T[]>({
		value: valueProp,
		defaultValue: defaultValue as T | T[] | undefined,
		onValueChange: handleValueChange,
	})

	const comboboxId = useId()

	const inputRef = useRef<HTMLInputElement>(null)

	const optionsRef = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRoving(optionsRef, {
		itemSelector: OPTION_SELECTOR,
		focusOnEmpty: true,
	})

	const keyboardSettled = useKeyboardSettled()

	const {
		query,
		deferredQuery,
		setQuery,
		open,
		setOpen,
		editing,
		setEditing,
		close,
		select,
		flushPending,
		selectionValue,
	} = useComboboxState<T>({
		multiple,
		nullable,
		selectable,
		value,
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

	const triggerHandlers = useComboboxTrigger({ open, close, setOpen, inputRef })

	const scrollWithin = useScrollWithin()

	const scrollToSelected = useCallback(
		(node: HTMLDivElement | null) => {
			if (!node) return

			const selected = node.querySelector<HTMLElement>('[role="option"][data-selected]')

			if (selected) scrollWithin(selected, { block: 'nearest' })
		},
		[scrollWithin],
	)

	const rendered = typeof children === 'function' ? children(query, deferredQuery) : children

	const hasValue = multiple
		? Array.isArray(value) && value.length > 0
		: value !== undefined && !Array.isArray(value)

	const showClear = clearable && hasValue && !resolvedDisabled

	const clearSuffix = showClear ? (
		<Button
			variant="bare"
			className="pointer-events-auto"
			aria-label="Clear selection"
			onMouseDown={(event) => event.stopPropagation()}
			onClick={(event) => {
				event.stopPropagation()

				setValue(multiple ? ([] as T[]) : undefined)

				inputRef.current?.focus()
			}}
		>
			<Icon icon={<X />} />
		</Button>
	) : null

	// The input display reads the live `value` (updates instantly on select); the
	// menu reads `selectionValue`, which stays frozen until the panel finishes
	// closing so the selected row doesn't flicker during the exit animation.
	const contextValue = useMemo(
		() => ({ value: selectionValue, multiple, onSelect: select as (v: unknown) => void }),
		[selectionValue, multiple, select],
	)

	if (skeleton) {
		return <ControlSkeleton size={size} className={className} />
	}

	return (
		<ComboboxContext value={contextValue}>
			<SelectTrigger
				open={open}
				setReference={refs.setReference}
				getReferenceProps={getReferenceProps}
				glass={glass}
				size={resolvedSize}
				className={className}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
				data-slot={slot}
				prefix={prefix}
				suffix={suffix || clearSuffix || <Icon icon={<ChevronsUpDown />} />}
				suffixProps={
					suffix || showClear
						? undefined
						: {
								// Decorative toggle affordance: the input owns combobox
								// semantics (aria-expanded/controls), so the chevron is a
								// mouse convenience hidden from assistive tech rather than a
								// second, keyboard-inoperable button.
								'aria-hidden': true,
								onMouseDown: resolvedDisabled ? undefined : triggerHandlers.onMouseDown,
							}
				}
			>
				<ComboboxInput
					id={id}
					ref={inputRef}
					type={inputType}
					autoComplete={autoComplete}
					open={open}
					controlsId={comboboxId}
					disabled={resolvedDisabled}
					value={inputDisplay}
					placeholder={placeholder}
					density={token.density}
					size={token.size}
					handlers={inputHandlers}
				/>
			</SelectTrigger>

			<ComboboxPanel
				id={comboboxId}
				open={open}
				editing={editing}
				glass={glass}
				density={token.density}
				size={token.size}
				floatingStyles={floatingStyles}
				getFloatingProps={getFloatingProps}
				optionsRef={optionsRef}
				setFloating={refs.setFloating}
				scrollToSelected={scrollToSelected}
				flushPending={flushPending}
				onClose={close}
			>
				{rendered}
			</ComboboxPanel>
		</ComboboxContext>
	)
}
