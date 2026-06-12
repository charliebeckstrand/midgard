'use client'

import type { Placement } from '@floating-ui/react'
import { ChevronsUpDown, X } from 'lucide-react'
import {
	type InputHTMLAttributes,
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
} from 'react'
import {
	useA11yRoving,
	useFloatingUI,
	useScrollWithin,
	useSelectableValueChange,
} from '../../hooks'
import { queryItems, setVirtualActive } from '../../hooks/a11y/use-a11y-roving'
import { useKeyboardSettled } from '../../hooks/use-keyboard-settled'
import { useControlSize } from '../../primitives/density'
import { QueryContext, useQueryValue } from '../../primitives/query'
import { SelectTrigger } from '../../primitives/select-trigger'
import { useGlass } from '../../providers/glass/context'
import { useSkeleton } from '../../providers/skeleton'
import { Button } from '../button'
import { type ControlSize, useControl } from '../control/context'
import { ControlSkeleton } from '../control/control-skeleton'
import { useFormValue } from '../form/use-form-value'
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
	/** Binds the selected value to an enclosing Form field. */
	name?: string
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
	/**
	 * Accessible name for the input. Required when no `<Field>`/`<Label>` wraps
	 * the combobox, since the placeholder is not a programmatic name.
	 */
	'aria-label'?: string
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
	 * Items to render inside the panel. Read the live and deferred query with
	 * `useComboboxQuery()`; filter heavy lists against `deferredQuery` to keep
	 * typing responsive.
	 */
	children: ReactNode
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

/**
 * Type-ahead select pairing a text input with a floating option panel:
 * single or `multiple` selection, controlled or uncontrolled `value`, and an
 * optional `clearable` affordance. Children read the live and deferred query
 * through `useComboboxQuery()` for client-side filtering.
 */
export function Combobox<T>({
	id,
	name,
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
	'aria-label': ariaLabel,
	'data-group': dataGroup,
	'data-group-orientation': dataGroupOrientation,
	'data-slot': slot = 'combobox',
	children,
}: ComboboxProps<T>) {
	const glass = useGlass()
	const control = useControl()
	const skeleton = useSkeleton()
	const token = useControlSize(size)

	const resolvedSize = token.size

	const resolvedDisabled = disabled ?? control?.disabled

	const handleValueChange = useSelectableValueChange<T>(
		onValueChange as ((value: T | T[] | undefined) => void) | undefined,
		multiple,
	)

	const { value, setValue, setTouched } = useFormValue<T | T[]>(name, {
		value: valueProp,
		defaultValue: defaultValue as T | T[] | undefined,
		onValueChange: handleValueChange,
	})

	const comboboxId = useId()

	const inputRef = useRef<HTMLInputElement>(null)

	const optionsRef = useRef<HTMLDivElement>(null)

	// Editable combobox (APG): DOM focus stays on the input; the highlight is
	// tracked virtually. Arrow keys move `data-active` and repoint the input's
	// `aria-activedescendant`. `aria-selected` is owned by each option (the
	// stored value), keeping the highlight as a pure focus cue.
	const handleKeyDown = useA11yRoving(optionsRef, {
		mode: 'virtual',
		itemSelector: OPTION_SELECTOR,
		activeDescendantRef: inputRef,
		manageAriaSelected: false,
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

	// Keeps the virtual highlight anchored to a real option: clears
	// `aria-activedescendant` while the menu is closed, and on each filter
	// change jumps it to the top match (or clears it when nothing matches).
	// Skips the initial query; the first arrow key then picks the first option.
	// Passes `ariaSelected: false`; options own their selection state.
	//
	// Under `VirtualOptions` only windowed rows are in the DOM; the active row
	// stays within the rendered window.
	const lastQueryRef = useRef(deferredQuery)

	useEffect(() => {
		if (!open) {
			setVirtualActive([], -1, inputRef, { ariaSelected: false })

			lastQueryRef.current = deferredQuery

			return
		}

		if (lastQueryRef.current === deferredQuery) return

		lastQueryRef.current = deferredQuery

		const items = queryItems(optionsRef.current, OPTION_SELECTOR)

		setVirtualActive(items, items.length > 0 ? 0 : -1, inputRef, { ariaSelected: false })
	}, [open, deferredQuery])

	// Async option swaps for an unchanged query (e.g. address suggestions
	// resolving) unmount the highlighted option while `deferredQuery`, the key
	// of the effect above, never changes; `aria-activedescendant` dangles.
	// The swap may also originate below this root (a query-context consumer
	// re-rendering on its own async state), where no render of this component
	// observes it; a MutationObserver on the options wrapper does. Re-anchors
	// to the top match only when the highlight's id has left the document.
	useEffect(() => {
		if (!open) return

		const node = optionsRef.current

		if (!node) return

		const observer = new MutationObserver(() => {
			const activeId = inputRef.current?.getAttribute('aria-activedescendant')

			if (!activeId || document.getElementById(activeId)) return

			const items = queryItems(node, OPTION_SELECTOR)

			setVirtualActive(items, items.length > 0 ? 0 : -1, inputRef, { ariaSelected: false })
		})

		observer.observe(node, { childList: true, subtree: true })

		return () => observer.disconnect()
	}, [open])

	const { refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange: setOpen,
		matchReferenceWidth: true,
		// The input and panel carry their own roles + popup wiring; `role: null`
		// suppresses floating-ui's wrapper roles.
		role: null,
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
		onTouched: setTouched,
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

	// The input display reads the live `value`; the menu reads `selectionValue`,
	// which stays frozen until the panel finishes closing.
	const contextValue = useMemo(
		() => ({ value: selectionValue, multiple, onSelect: select as (v: unknown) => void }),
		[selectionValue, multiple, select],
	)

	const queryValue = useQueryValue(query, deferredQuery)

	if (skeleton) {
		return <ControlSkeleton size={size} className={className} />
	}

	return (
		<ComboboxContext value={contextValue}>
			<QueryContext value={queryValue}>
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
									// Decorative mouse-only affordance; hidden from assistive
									// tech. The input carries combobox semantics.
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
						aria-label={ariaLabel}
						open={open}
						controlsId={comboboxId}
						disabled={resolvedDisabled}
						value={inputDisplay}
						placeholder={placeholder}
						density={token.space}
						size={token.size}
						handlers={inputHandlers}
					/>
				</SelectTrigger>

				<ComboboxPanel
					id={comboboxId}
					open={open}
					editing={editing}
					multiple={multiple}
					glass={glass}
					density={token.space}
					size={token.size}
					ariaLabel={ariaLabel}
					// Names the listbox from the input's name: an explicit aria-label
					// wins, else the field's Label (via Control).
					ariaLabelledby={ariaLabel ? undefined : control?.labelledBy}
					floatingStyles={floatingStyles}
					getFloatingProps={getFloatingProps}
					optionsRef={optionsRef}
					setFloating={refs.setFloating}
					scrollToSelected={scrollToSelected}
					flushPending={flushPending}
					onClose={close}
				>
					{children}
				</ComboboxPanel>
			</QueryContext>
		</ComboboxContext>
	)
}
