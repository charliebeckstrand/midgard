'use client'

import type { Placement } from '@floating-ui/react'
import { ChevronsUpDown, X } from 'lucide-react'
import {
	type InputHTMLAttributes,
	type ReactNode,
	type RefObject,
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
import {
	clearVirtualActive,
	clearVirtualActiveIndexed,
	queryItems,
	seedVirtualTopMatch,
	setVirtualActive,
	type VirtualItemSource,
} from '../../hooks/a11y/use-a11y-roving'
import { useKeyboardSettled } from '../../hooks/use-keyboard-settled'
import { useControlSize } from '../../primitives/density'
import { QueryContext, useQueryValue } from '../../primitives/query'
import { SelectTrigger } from '../../primitives/select-trigger'
import {
	resolveCapitalize,
	type SelectCapitalize,
} from '../../primitives/select-trigger/capitalize'
import { VirtualItemSourceContext } from '../../primitives/virtual-options/virtual-item-source-context'
import { useGlass } from '../../providers/glass/context'
import { Button } from '../button'
import { type ControlSize, useControl } from '../control/context'
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
	name?: string
	placeholder?: string
	displayValue?: (value: T) => string
	placement?: Placement
	prefix?: ReactNode
	suffix?: ReactNode
	size?: ControlSize
	disabled?: boolean
	/** Keeps the input focusable and the value submitted, but blocks typing and opening. */
	readOnly?: boolean
	/** Marks the field required; surfaces `required`/`aria-required` on the input. */
	required?: boolean
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
	/**
	 * Closes the menu on select.
	 *
	 * @defaultValue `true` for single selection, `false` for `multiple`
	 */
	closeOnSelect?: boolean
	/** Clears the value when the user empties the input while editing. */
	clearOnEmpty?: boolean
	/** Show a clear button in place of the chevron when a value is selected. */
	clearable?: boolean
	/**
	 * Applies the `capitalize` text-transform to the input's resolved
	 * `displayValue` and the option list. Pass an object to target each surface
	 * independently. The transform is visual only; the underlying query and value
	 * are untouched.
	 * @defaultValue true
	 */
	capitalize?: SelectCapitalize
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

/**
 * Seeds the virtual highlight to the top match via {@link seedVirtualTopMatch},
 * with this combobox's selector and `ariaSelected: false` (options own their
 * selection state) applied. Shared by the highlight-anchoring effect and the
 * option-swap re-anchor observer below.
 *
 * @internal
 */
function seedTopMatch(
	node: HTMLElement | null,
	source: VirtualItemSource | null,
	activeIndexRef: RefObject<number>,
	inputRef: RefObject<HTMLInputElement | null>,
): void {
	seedVirtualTopMatch(node, OPTION_SELECTOR, source, activeIndexRef, inputRef, {
		ariaSelected: false,
	})
}

/**
 * Re-anchors the highlight when an option swap (async data, unrelated to the
 * query) drops the active one. Under a registered `virtualSourceRef`, a
 * missing DOM row is the normal windowed-out state — `setVirtualActiveIndexed`
 * already watches for it to mount — so this only re-anchors when
 * `activeIndexRef` is out of bounds for the source's live `count`, the
 * unambiguous signal that the underlying data (not just the window) dropped
 * it. Without a registered source, DOM absence is checked directly.
 *
 * @internal
 */
function reanchorOnOptionSwap(
	node: HTMLElement,
	virtualSourceRef: RefObject<VirtualItemSource | null>,
	activeIndexRef: RefObject<number>,
	inputRef: RefObject<HTMLInputElement | null>,
): void {
	const source = virtualSourceRef.current

	if (source) {
		if (activeIndexRef.current >= 0 && activeIndexRef.current < source.count) return

		seedTopMatch(node, source, activeIndexRef, inputRef)

		return
	}

	const activeId = inputRef.current?.getAttribute('aria-activedescendant')

	if (!activeId || document.getElementById(activeId)) return

	seedTopMatch(node, null, activeIndexRef, inputRef)
}

/**
 * Props for {@link Combobox}, discriminated on `multiple` so `value`,
 * `defaultValue`, and `onValueChange` resolve to single or array shapes.
 *
 * @typeParam T - The option value type.
 */
export type ComboboxProps<T> = ComboboxBaseProps<T> &
	(ComboboxSingleProps<T> | ComboboxMultipleProps<T>)

/**
 * Type-ahead select pairing a text input with a floating option panel.
 * Supports single or `multiple` selection, controlled or uncontrolled `value`,
 * and `clearable`/`nullable` affordances; resolves `size`, `disabled`,
 * `readOnly`, and `required` against an enclosing `<Control>`/Density and
 * registers with `<Form>` under `name`. Tracks the highlight as a virtual
 * active-descendant (APG editable combobox) with DOM focus held on the input,
 * re-anchoring across filter and async option changes. Filtering is
 * consumer-driven: `children` read the live and deferred query via
 * {@link useComboboxQuery} and render matching {@link ComboboxOption}s,
 * supporting both synchronous lists and async option sources. Wrap the
 * options in `VirtualOptions` with `getOptionId` for large lists: arrow /
 * type-ahead then navigate the full option set by index, reaching options
 * outside the rendered window instead of stopping at its edge.
 *
 * @remarks
 * Supply `aria-label` when no `<Field>`/`<Label>` wraps the combobox; the
 * placeholder is not a programmatic name. Composes `<ComboboxOption>` with
 * optional `<ComboboxLabel>`/`<ComboboxDescription>` inside.
 *
 * @typeParam T - The option value type.
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
	readOnly,
	required,
	selectable = true,
	nullable = valueProp === undefined && defaultValue === undefined,
	closeOnSelect,
	clearOnEmpty = false,
	clearable = false,
	capitalize = true,
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

	const token = useControlSize(size)

	const resolvedSize = token.size

	const resolvedDisabled = disabled ?? control?.disabled

	const resolvedReadOnly = readOnly ?? control?.readOnly

	const resolvedRequired = required ?? control?.required

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

	// Registered by a `VirtualOptions` (with `getOptionId`) inside `children`,
	// via `VirtualItemSourceContext`; null for a non-virtualized combobox, which
	// keeps the DOM-query roving below unchanged.
	const virtualSourceRef = useRef<VirtualItemSource | null>(null)

	// Logical active index for the virtual source, since a windowed-out active
	// row has no DOM `data-active` marker to read it back off of.
	const activeIndexRef = useRef(-1)

	// Editable combobox (APG): DOM focus stays on the input; the highlight is
	// tracked virtually. Arrow keys move `data-active` and repoint the input's
	// `aria-activedescendant`. `aria-selected` is owned by each option (the
	// stored value), keeping the highlight as a pure focus cue.
	const handleKeyDown = useA11yRoving(optionsRef, {
		mode: 'virtual',
		itemSelector: OPTION_SELECTOR,
		activeDescendantRef: inputRef,
		manageAriaSelected: false,
		itemSource: virtualSourceRef,
		activeIndexRef,
	})

	const keyboardSettled = useKeyboardSettled()

	const {
		query,
		deferredQuery,
		menuQuery,
		menuDeferredQuery,
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

	// readOnly keeps the input focusable and the value submitted but blocks
	// every open path (input focus/typing, suffix toggle, floating-ui); closing
	// stays allowed. Typing is also stopped natively by the input's readOnly.
	const setOpenGuarded = useCallback(
		(next: boolean) => {
			if (resolvedReadOnly && next) return

			setOpen(next)
		},
		[resolvedReadOnly, setOpen],
	)

	// Set when an arrow-key open should seat the highlight on the current
	// selection rather than leave it empty; consumed by the highlight-anchoring
	// effect below once the panel's options mount.
	const anchorSelectedOnOpenRef = useRef(false)

	const openByArrowKey = useCallback(() => {
		if (resolvedReadOnly) return

		// Release any selection frozen for an in-flight close animation so the
		// reopened panel paints `data-selected` this render; otherwise the
		// snapshot lags the live value by a render and the effect below, reading
		// the DOM, would miss it.
		flushPending()

		anchorSelectedOnOpenRef.current = true

		setOpen(true)
	}, [resolvedReadOnly, flushPending, setOpen])

	// Keeps the virtual highlight anchored to a real option: clears
	// `aria-activedescendant` while the menu is closed, on each filter change
	// jumps it to the top match (or clears it when nothing matches), and on an
	// arrow-key open seats it on the current single-mode selection. Skips the
	// initial query; the first arrow key then picks the first option. Passes
	// `ariaSelected: false`; options own their selection state.
	//
	// Under a registered `virtualSourceRef`, index math replaces the DOM query
	// (a windowed-out option isn't in the DOM to find), via
	// `setVirtualActiveIndexed`/`clearVirtualActiveIndexed`. Anchoring to the
	// *current selection* on an arrow-key open still needs the DOM (there's no
	// index-space "find the selected row" without scanning rendered rows), which
	// a windowed selection may not satisfy; it degrades to the top-match seed
	// below instead of guessing.
	const lastQueryRef = useRef(deferredQuery)

	useEffect(() => {
		const source = virtualSourceRef.current

		if (!open) {
			if (source) clearVirtualActiveIndexed(optionsRef.current, activeIndexRef, inputRef)
			else clearVirtualActive(inputRef)

			lastQueryRef.current = deferredQuery

			anchorSelectedOnOpenRef.current = false

			return
		}

		const anchorSelected = anchorSelectedOnOpenRef.current

		anchorSelectedOnOpenRef.current = false

		// An arrow-key open seats the highlight on the current selection so the
		// menu opens with the active value rather than the empty highlight a plain
		// open leaves; with nothing selected it falls through to that empty
		// highlight. Single mode only — `multiple` carries no single selection.
		if (anchorSelected && !source) {
			const items = queryItems(optionsRef.current, OPTION_SELECTOR)

			const selectedIndex = multiple
				? -1
				: items.findIndex((item) => item.matches('[data-selected]'))

			setVirtualActive(items, selectedIndex, inputRef, { ariaSelected: false })

			lastQueryRef.current = deferredQuery

			return
		}

		// A virtualized arrow-key open falls through to the top-match seed below
		// (see the effect's remark above); a plain open re-seeds only once the
		// query actually changes.
		if (!anchorSelected && lastQueryRef.current === deferredQuery) return

		lastQueryRef.current = deferredQuery

		seedTopMatch(optionsRef.current, source, activeIndexRef, inputRef)
	}, [open, deferredQuery, multiple])

	// Async option swaps for an unchanged query (e.g. address suggestions
	// resolving) unmount the highlighted option while `deferredQuery`, the key
	// of the effect above, never changes; `aria-activedescendant` dangles.
	// The swap may also originate below this root (a query-context consumer
	// re-rendering on its own async state), where no render of this component
	// observes it; a MutationObserver on the options wrapper does.
	//
	// Under a registered `virtualSourceRef`, a missing DOM row is the normal
	// windowed-out state — `setVirtualActiveIndexed` already watches for it to
	// mount — so this only re-anchors when `activeIndexRef` is actually out of
	// bounds for the source's live `count`, the unambiguous signal that the
	// underlying data (not just the window) dropped it.
	useEffect(() => {
		if (!open) return

		const node = optionsRef.current

		if (!node) return

		const observer = new MutationObserver(() =>
			reanchorOnOptionSwap(node, virtualSourceRef, activeIndexRef, inputRef),
		)

		observer.observe(node, { childList: true, subtree: true })

		return () => observer.disconnect()
	}, [open])

	const { refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange: setOpenGuarded,
		matchReferenceWidth: true,
		// The input and panel carry their own roles + popup wiring; `role: null`
		// suppresses floating-ui's wrapper roles.
		role: null,
	})

	const capitalization = resolveCapitalize(capitalize)

	const inputDisplay = resolveInputDisplay({ editing, query, value, displayValue, multiple })

	const inputHandlers = useComboboxInput<T>({
		multiple,
		clearOnEmpty,
		value,
		floatingRef: refs.floating,
		optionsRef,
		open,
		setValue,
		setEditing,
		setQuery,
		setOpen: setOpenGuarded,
		openByArrowKey,
		close,
		onTouched: setTouched,
		keyboardSettled,
		rovingKeyDown: handleKeyDown,
	})

	const triggerHandlers = useComboboxTrigger({ open, close, setOpen: setOpenGuarded, inputRef })

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

	const showClear = clearable && hasValue && !resolvedDisabled && !resolvedReadOnly

	const clearSuffix = showClear ? (
		<Button
			type="button"
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

	// The menu content reads the frozen-through-close query so its filter (and a
	// deeply scrolled virtual window) holds steady during the exit animation; the
	// input display above still reads the live `value`.
	const queryValue = useQueryValue(menuQuery, menuDeferredQuery)

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
					suffixProps={{
						// Mouse-only toggle affordance; the input carries combobox
						// semantics. Only the default chevron is decorative enough to
						// hide from assistive tech — custom suffix content (e.g. a live
						// LoadingSpinner) owns its own semantics. Interactive suffix
						// content (the clear button) stops propagation to opt out.
						'aria-hidden': suffix || showClear ? undefined : true,
						onMouseDown:
							resolvedDisabled || resolvedReadOnly ? undefined : triggerHandlers.onMouseDown,
					}}
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
						readOnly={resolvedReadOnly}
						required={resolvedRequired}
						value={inputDisplay}
						placeholder={placeholder}
						editing={editing}
						capitalize={capitalization.displayValue}
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
					capitalize={capitalization.options}
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
					<VirtualItemSourceContext value={virtualSourceRef}>{children}</VirtualItemSourceContext>
				</ComboboxPanel>
			</QueryContext>
		</ComboboxContext>
	)
}
