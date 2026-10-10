'use client'

import { ChevronsUpDown } from 'lucide-react'
import {
	type ClipboardEventHandler,
	type ComponentProps,
	type KeyboardEvent,
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from 'react'
import type { ScaleStep } from '../../core/density'
import {
	type FloatingPlacement,
	useA11yRoving,
	useFloatingUI,
	useScrollWithin,
	useSelectableValueChange,
} from '../../hooks'
import {
	clearVirtualActive,
	clearVirtualActiveIndexed,
	isVirtualActiveRowGone,
	isVirtualTopMatchSeated,
	queryItems,
	seedVirtualTopMatch,
	setVirtualActive,
	setVirtualActiveIndexed,
	type VirtualItemSource,
	virtualTopMatchIndex,
} from '../../hooks/a11y/use-a11y-roving'
import { useComposedRef } from '../../hooks/use-composed-ref'
import { useKeyboardSettled } from '../../hooks/use-keyboard-settled'
import { useStableEvent } from '../../hooks/use-stable-event'
import { DeferredQueryContext, QueryContext, useQueryValue } from '../../primitives/query'
import { SelectTrigger } from '../../primitives/select-trigger'
import { VirtualItemSourceContext } from '../../primitives/virtual-options/context'
import { useGlass } from '../../providers/glass/context'
import type { scale } from '../../recipes/kata/combobox'
import type { GroupStampProps } from '../../types/group-stamp'
import { useControl } from '../control/context'
import { useControlProps } from '../control/use-control-props'
import { useFormValue } from '../form/use-form-value'
import { Icon } from '../icon'
import { InputClearButton } from '../input/input-clear-button'
import { OPTION_SELECTOR } from './combobox-constants'
import { ComboboxInput } from './combobox-input'
import { ComboboxPanel } from './combobox-panel'
import { resolveInputDisplay, resolveInputTitle } from './combobox-utilities'
import { ComboboxContext } from './context'
import { useComboboxInput } from './use-combobox-input'
import { routeFloatingOpenChange, useComboboxState } from './use-combobox-state'
import { useComboboxTrigger } from './use-combobox-trigger'

type ComboboxBaseProps<T> = GroupStampProps & {
	id?: string
	name?: string
	/** @defaultValue 'Search' */
	placeholder?: string
	/**
	 * Formats a stored value for the input's resting display — what shows when the
	 * user is not typing. Under `multiple` a single selection reads as its label,
	 * and anything past one as a `"N selected"` count. The full list shows on hover
	 * as the input's `title`.
	 *
	 * Tighter than `Listbox`, which joins up to three, and for a reason particular
	 * to this control. A listbox trigger is a button whose text truncates and
	 * stops, while this is a text input. A joined value longer than the field
	 * therefore scrolls under the caret while the input has focus, and shows the
	 * middle of a sentence. Without a resolver a `multiple` combobox can only ever show the
	 * count, and a single-selection one shows nothing. Supply one wherever the
	 * selection needs to be legible with the panel closed.
	 */
	displayValue?: (value: T) => string
	/**
	 * Names a `multiple` selection the field can only count — everything past one, and
	 * every selection at all when there is no {@link ComboboxBaseProps.displayValue}.
	 *
	 * The threshold stays the control's. WHEN to stop listing labels is a property
	 * of a text input whose content scrolls (see `displayValue`). WHAT the things
	 * are is the caller's. The default `"2 selected"` says how many of nothing in
	 * particular. That is fine beside its own label, and ambiguous in a row of six
	 * filters. There `summarize={(codes) => \`${codes.length} postal codes\`}` reads.
	 *
	 * **Return an empty string to let the `placeholder` through**, which is the same rule an
	 * empty selection already follows. That is what a field whose values are TYPED IN
	 * rather than picked wants. The input stays blank and ready after every commit,
	 * instead of holding a summary the next keystroke has to displace. The
	 * placeholder carries the count. Note the trade. A placeholder is not a
	 * programmatic name and is announced inconsistently. A field doing that owes the
	 * selection another reading.
	 *
	 * The full list is still the input's `title` on hover, unsummarized.
	 *
	 * @defaultValue `` `${selected.length} selected` ``
	 */
	summarize?: (selected: T[]) => string
	/**
	 * The side and the alignment of the panel. A `<side>-auto` value, such as
	 * `'bottom-auto'`, aligns the panel to the edge of the trigger that is nearer
	 * to the edge of the viewport.
	 * @defaultValue 'bottom-start'
	 */
	placement?: FloatingPlacement
	prefix?: ReactNode
	suffix?: ReactNode
	size?: ScaleStep<typeof scale>
	/** @defaultValue `false`, or the state of the enclosing Control or Field. */
	disabled?: boolean
	/**
	 * Keeps the input focusable and the value submitted, but blocks typing and
	 * opening. A controlled `open` can show the panel, but an option click does
	 * not commit, as with `disabled`.
	 * @defaultValue `false`, or the state of the enclosing Control.
	 */
	readOnly?: boolean
	/**
	 * Marks the field required; surfaces `required`/`aria-required` on the input.
	 * A selection satisfies it, so the native `required` drops while a value is
	 * selected, also when the input shows no text.
	 * @defaultValue `false`, or the state of the enclosing Control.
	 */
	required?: boolean
	className?: string
	/**
	 * The `autocomplete` attribute of the input. The prop wins over the
	 * `autoComplete` of an enclosing `<Control>`.
	 * @defaultValue the `autoComplete` of the enclosing `<Control>`, else `'off'`.
	 */
	autoComplete?: ComponentProps<'input'>['autoComplete']
	/**
	 * Accessible name for the input. Required when no `<Field>`/`<Label>` wraps
	 * the combobox, since the placeholder is not a programmatic name.
	 */
	'aria-label'?: string
	/** Element naming the input, for a name already on the page. `aria-label` wins over it. */
	'aria-labelledby'?: string
	/** Consumer-supplied `aria-describedby`, merged ahead of the field's registered description/error ids. */
	'aria-describedby'?: string
	/**
	 * Clicking the selected option clears it.
	 * @defaultValue `true` while neither `value` nor `defaultValue` holds a value, else `false`.
	 */
	nullable?: boolean
	/**
	 * Closes the menu on select.
	 *
	 * @defaultValue `true`, or `false` with `multiple`.
	 */
	closeOnSelect?: boolean
	/**
	 * Clears the value when the user empties the input while editing.
	 * @defaultValue false
	 */
	clearOnEmpty?: boolean
	/**
	 * Show a clear button in place of the chevron when a value is selected.
	 * @defaultValue false
	 */
	clearable?: boolean
	/**
	 * Runs when the clear button empties the selection, with the combobox's own
	 * input. It runs *instead of* the default's return-focus, so the handler owns
	 * where focus lands after a clear.
	 *
	 * With no handler, focus returns to the input, because the clear button
	 * unmounts along with the value it cleared and focus would otherwise be lost.
	 * The input opens the menu on focus, though, so that reopens the list the clear
	 * just emptied. Passing the input makes the alternatives one-liners:
	 *
	 * ```tsx
	 * <Combobox clearable onClear={(input) => input?.blur()} />   // leave the field
	 * <Combobox clearable onClear={(input) => input?.focus()} />  // the default, kept
	 * ```
	 *
	 * Leaving the field costs the focus the default was protecting. A clear from
	 * the keyboard lands on `<body>`, so a keyboard user loses their place in the
	 * page (WCAG 2.4.3). Prefer it where clearing is a pointer affordance. The
	 * cleared value itself still reports through `onValueChange`; this hook is
	 * about what happens next, not about the value.
	 */
	onClear?: (input: HTMLInputElement | null) => void
	/**
	 * Capitalizes the first letter (first word only) of the input's resolved
	 * `displayValue` and of each option's string label; custom label nodes
	 * render as authored. One flag sets both surfaces. Display-only: the
	 * underlying query and value are untouched.
	 *
	 * The input applies it to each resolved display string, so the `summarize`
	 * output of a multiple selection is capitalized too.
	 * @defaultValue true
	 */
	capitalize?: boolean
	/**
	 * Shows the whole value in a tooltip on hover while the input truncates it.
	 * The tooltip does not open while the panel is open or the user types, so it
	 * does not cover the options. A touch press does not open it, as with any
	 * hover tooltip.
	 * @defaultValue false
	 */
	truncateTooltip?: boolean
	/**
	 * Controlled menu open state.
	 * @defaultValue Uncontrolled: the menu starts closed.
	 */
	open?: boolean
	/** Fires when the menu open state changes. */
	onOpenChange?: (open: boolean) => void
	/** Fires when the input query changes. */
	onQueryChange?: (query: string) => void
	/**
	 * A paste into the input, before the browser inserts it.
	 *
	 * For a combobox whose values are TYPED IN rather than picked from a fetched list, a pasted
	 * delimited list is one value per token. Call `preventDefault` and commit them through
	 * `onValueChange`. Reading `clipboardData` here is the only point such a list is still
	 * splittable. A native `<input>` strips newlines from its own value. By `onChange` a pasted
	 * spreadsheet column has arrived as one undelimited run, with every boundary destroyed.
	 *
	 * Preventing the default is how the combobox is told the paste was consumed. The draft it
	 * replaced is then dropped and editing ends, the same way selecting an option does. The field
	 * is therefore not left holding a query the handler has already turned into a selection. A
	 * paste left alone is ordinary typing and lands at the caret.
	 *
	 * It does not run while the combobox is read-only or disabled, because the lock blocks each commit.
	 */
	onPaste?: ClipboardEventHandler<HTMLInputElement>
	/** Root slot identifier. Wrappers override it to stamp their own name. */
	'data-slot'?: string
	/**
	 * Items to render inside the panel. Read the deferred query with
	 * `useComboboxDeferredQuery()`, and filter heavy lists against it to keep
	 * typing responsive. `useComboboxQuery()` also gives the live query, but its
	 * consumer renders again for each keystroke.
	 */
	children: ReactNode
}

type ComboboxSingleProps<T> = {
	/** Controlled value. `undefined` leaves the combobox uncontrolled; `null` keeps it controlled with no selection (CONVENTIONS §7.3). */
	value?: T | null
	defaultValue?: T
	/** Fires with the new selection, or `null` when it is cleared. */
	onValueChange?: (value: T | null) => void
	/**
	 * Allows more than one selection. Set it to `true` to take an array `value`.
	 * @defaultValue false
	 */
	multiple?: false
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
 * Seats the highlight for an arrow-key open. It goes on the current selection,
 * so the menu opens with the active value. A plain open leaves the highlight
 * empty, and so does an arrow-key open with nothing selected. Single mode
 * only — `multiple` carries no single selection.
 *
 * A windowed selection cannot be found without the DOM, so a registered
 * `source` seats the first option that `isDisabled` does not mark
 * (`virtualTopMatchIndex`) instead of guessing. The key is an explicit
 * move, so this does not go through {@link seedTopMatch}, which clears the
 * highlight on a device with no hover.
 *
 * @internal
 */
export function seatOnArrowOpen(
	node: HTMLElement,
	source: VirtualItemSource | null,
	multiple: boolean,
	activeIndexRef: RefObject<number>,
	inputRef: RefObject<HTMLInputElement | null>,
): void {
	if (source) {
		setVirtualActiveIndexed(node, source, virtualTopMatchIndex(source), activeIndexRef, inputRef, {
			ariaSelected: false,
		})

		return
	}

	const items = queryItems(node, OPTION_SELECTOR)

	const selectedIndex = multiple ? -1 : items.findIndex((item) => item.matches('[data-selected]'))

	setVirtualActive(items, selectedIndex, inputRef, { ariaSelected: false })
}

/**
 * The origin of the highlight, which {@link reanchorOnOptionSwap} reads when the
 * rows change:
 *
 * - `'empty'`: the highlight is empty by design, as after a plain open.
 * - `'seeded'`: a filter change put the highlight on the top match, or found no
 *   row for it.
 * - `'moved'`: a key set the highlight, with an arrow key or an arrow-key open.
 *
 * @internal
 */
export type HighlightOrigin = 'empty' | 'seeded' | 'moved'

/**
 * Re-anchors the highlight when the rows change under an unchanged query, as
 * when async data arrives. `originRef` decides the move:
 *
 * - An empty highlight stays empty. A change to the window of a source does
 *   not seed row 0 after a plain open.
 * - A seeded highlight follows the top match. The first row that mounts after
 *   a filter change that found no row takes it. A new top match that mounts
 *   above it also takes it.
 * - A moved highlight stays while its row exists. Without a source, the row
 *   exists while it is in the DOM. Under a registered `virtualSourceRef`, a row
 *   out of the window is not in the DOM, and `setVirtualActiveIndexed` watches
 *   for it to mount. There the row exists while `activeIndexRef` is below the
 *   live `count` of the source. When the row goes, the top match takes a seed.
 *
 * @internal
 */
export function reanchorOnOptionSwap(
	node: HTMLElement,
	virtualSourceRef: RefObject<VirtualItemSource | null>,
	activeIndexRef: RefObject<number>,
	inputRef: RefObject<HTMLInputElement | null>,
	originRef: RefObject<HighlightOrigin>,
): void {
	if (originRef.current === 'empty') return

	const source = virtualSourceRef.current

	if (originRef.current === 'seeded') {
		if (isVirtualTopMatchSeated(node, OPTION_SELECTOR, source, activeIndexRef, inputRef)) return
	} else if (!isVirtualActiveRowGone(source, activeIndexRef, inputRef)) {
		return
	}

	seedTopMatch(node, source, activeIndexRef, inputRef)

	originRef.current = 'seeded'
}

/**
 * The text of the development warning of {@link warnOnMixedSource}.
 *
 * @internal
 */
const MIXED_SOURCE_WARNING =
	'Combobox: an option is outside the `items` of the `VirtualOptions` that registers the keyboard source. Arrow keys and type-ahead move through those items by index, so they do not reach the option. Put each option into the items, a create row too, and give it the `id` that `getOptionId` returns.'

/**
 * Warns in development when a registered `source` and an option outside its
 * items are in `node` together. The roving hook moves through the items of a
 * registered source by index, and does not query the DOM. Thus an arrow key or
 * type-ahead does not reach an option whose `id` is not a key of the source,
 * such as a create row after `VirtualOptions`. That mix is not supported.
 *
 * It warns one time for each combobox: `warnedRef` holds the flag.
 *
 * @internal
 */
function warnOnMixedSource(
	node: HTMLElement,
	source: VirtualItemSource | null,
	warnedRef: RefObject<boolean>,
): void {
	if (process.env.NODE_ENV === 'production' || warnedRef.current || !source) return

	const options = queryItems(node, OPTION_SELECTOR)

	if (options.length === 0) return

	const keys = new Set(Array.from({ length: source.count }, (_, index) => source.getKey(index)))

	if (options.every((option) => keys.has(option.id))) return

	warnedRef.current = true

	console.warn(MIXED_SOURCE_WARNING)
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
 * and `clearable`/`nullable` affordances. Resolves `autoComplete`, `disabled`,
 * `readOnly`, and `required` against an enclosing `<Control>`, takes the step
 * of the nearest density scope (an explicit `size` opens a scope on the
 * trigger and the panel), and
 * registers with `<Form>` under `name`. Tracks the highlight as a virtual
 * active-descendant (APG editable combobox) with DOM focus held on the input,
 * re-anchoring across filter and async option changes. Filtering is
 * consumer-driven: `children` read the live and deferred query via
 * {@link useComboboxQuery} and render matching {@link ComboboxOption}s,
 * supporting both synchronous lists and async option sources. Wrap the
 * options in `VirtualOptions` with `getOptionId` for large lists. Arrow and
 * type-ahead then navigate the full option set by index, reaching options
 * outside the rendered window instead of stopping at its edge. Each option
 * must then be one of the `items` of `VirtualOptions`. Put a create row into
 * the items, not after the wrapper. Arrow and type-ahead do not reach an
 * option outside the items, and a development warning tells you so.
 *
 * @remarks
 * Supply `aria-label` when no `<Field>`/`<Label>` wraps the combobox; the
 * placeholder is not a programmatic name. Composes `<ComboboxOption>` with
 * optional `<ComboboxLabel>`/`<ComboboxDescription>` inside. A filter change
 * moves the highlight to the top match, so Enter picks it. On a device with no
 * hover, such as a phone, a filter change clears the highlight, and only an
 * arrow key sets it.
 *
 * @typeParam T - The option value type.
 */
export function Combobox<T>({
	id,
	name,
	value: valueProp,
	defaultValue,
	displayValue,
	summarize,
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
	nullable: nullableProp,
	closeOnSelect,
	clearOnEmpty = false,
	clearable = false,
	onClear,
	capitalize = true,
	truncateTooltip,
	open: openProp,
	onOpenChange,
	onQueryChange,
	onPaste,
	className,
	autoComplete,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
	'aria-describedby': ariaDescribedBy,
	'data-group': dataGroup,
	'data-group-orientation': dataGroupOrientation,
	'data-slot': slot = 'combobox',
	children,
}: ComboboxProps<T>) {
	const glass = useGlass()

	const control = useControl()

	// Derived per render: while no value is held on either channel, clicking the
	// selected option clears it. Resolved here and not as a parameter default,
	// which the React Compiler cannot reorder.
	const nullable = nullableProp ?? (valueProp == null && defaultValue == null)

	const handleValueChange = useSelectableValueChange<T>(
		onValueChange as ((value: T | T[] | null) => void) | undefined,
		multiple,
	)

	const {
		value,
		setValue,
		setTouched,
		invalid: boundInvalid,
	} = useFormValue<T | T[]>(name, {
		value: valueProp,
		defaultValue: defaultValue as T | T[] | undefined,
		onValueChange: handleValueChange,
	})

	// Resolved after the binding, so the bound field's own errors reach the
	// control: `useControlProps` ORs them with an ambient `error` severity, and a
	// Combobox that withheld them rang only for a `<Field severity>` its consumer
	// set by hand — where the Input beside it rang for its own validator.
	const {
		disabled: resolvedDisabled,
		readOnly: resolvedReadOnly,
		required: resolvedRequired,
		invalid: resolvedInvalid,
		autoComplete: resolvedAutoComplete,
	} = useControlProps({ autoComplete, disabled, readOnly, required, invalid: boundInvalid })

	const comboboxId = useId()

	const inputRef = useRef<HTMLInputElement>(null)

	const optionsRef = useRef<HTMLDivElement>(null)

	// The options container mounts with the portal of the panel, after the open
	// commits. The effects below key on this state, so that they read the
	// options when the container attaches. The ref serves the key handlers.
	const [optionsNode, setOptionsNode] = useState<HTMLDivElement | null>(null)

	const attachOptions = useComposedRef(optionsRef, setOptionsNode)

	// Registered by a `VirtualOptions` (with `getOptionId`) inside `children`,
	// via `VirtualItemSourceContext`; null for a non-virtualized combobox, which
	// keeps the DOM-query roving below unchanged.
	const virtualSourceRef = useRef<VirtualItemSource | null>(null)

	// Logical active index for the virtual source, since a windowed-out active
	// row has no DOM `data-active` marker to read it back off of.
	const activeIndexRef = useRef(-1)

	// Where the highlight came from. The observer of option swaps below reads it.
	const highlightOriginRef = useRef<HighlightOrigin>('empty')

	// Set when `warnOnMixedSource` warns, so that it warns one time.
	const mixedSourceWarnedRef = useRef(false)

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

	// A key that moves the highlight makes it the user's, so a new top match does
	// not take it. A move writes `aria-activedescendant` before the handler
	// returns, also for a row of a source that is not mounted yet.
	const rovingKeyDown = useCallback(
		(event: KeyboardEvent<HTMLInputElement>) => {
			const before = inputRef.current?.getAttribute('aria-activedescendant')

			handleKeyDown(event)

			if (inputRef.current?.getAttribute('aria-activedescendant') !== before) {
				highlightOriginRef.current = 'moved'
			}
		},
		[handleKeyDown],
	)

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
		keep,
		flushPending,
		selectionValue,
	} = useComboboxState<T>({
		multiple,
		nullable,
		value,
		closeOnSelect,
		open: openProp,
		inputRef,
		onOpenChange,
		onQueryChange,
		setValue,
	})

	// A read-only or a disabled combobox does not open and does not commit. The
	// guard blocks each open path (input focus and typing, the suffix toggle,
	// floating-ui) and lets a close through. A read-only input stays focusable,
	// its value still submits, and its native readOnly also stops typing.
	const locked = resolvedReadOnly || resolvedDisabled

	// A disabled ancestor `<fieldset>` disables the input but sets no prop, so
	// `locked` stays false. Thus each guard also reads the native state of the
	// input when an event occurs. The Form uses that fieldset as its lock while
	// it submits. A stable event holds the read, because the open guard goes to
	// `routeFloatingOpenChange` during render, and the compiler skips a component
	// that gives a plain function a closure that reads a ref.
	const isLocked = useStableEvent(() => locked || inputRef.current?.matches(':disabled') === true)

	const setOpenGuarded = useCallback(
		(next: boolean) => {
			if (next && isLocked()) return

			setOpen(next)
		},
		[isLocked, setOpen],
	)

	// Enter on the selected option ends a pick with no change to the value. The
	// lock blocks it as it blocks the selection, so on a locked combobox Enter
	// does nothing on any option.
	const guardedKeep = useCallback(() => {
		if (isLocked()) return

		keep()
	}, [isLocked, keep])

	// Set when an arrow-key open must seat the highlight on the current
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
	// seeds it through `seedTopMatch`, and on an arrow-key open seats it through
	// `seatOnArrowOpen`. Skips the initial query; the first arrow key then picks
	// the first option. Passes `ariaSelected: false`; options own their
	// selection state. Each path records the origin of the highlight in
	// `highlightOriginRef`.
	//
	// Under a registered `virtualSourceRef`, index math replaces the DOM query
	// (a windowed-out option isn't in the DOM to find), via
	// `setVirtualActiveIndexed`/`clearVirtualActiveIndexed`.
	//
	// The effect also gives the open options to `warnOnMixedSource`. It runs
	// after the effects of `children`, so a `VirtualOptions` that the same
	// commit changes has registered its new source.
	const lastQueryRef = useRef(deferredQuery)

	useEffect(() => {
		const source = virtualSourceRef.current

		if (!open) {
			if (source) clearVirtualActiveIndexed(optionsRef.current, activeIndexRef, inputRef)
			else clearVirtualActive(inputRef)

			lastQueryRef.current = deferredQuery

			anchorSelectedOnOpenRef.current = false

			highlightOriginRef.current = 'empty'

			return
		}

		// The panel is open, but its options are not attached yet. Keep the
		// arrow-key flag until they attach and this effect runs again.
		if (!optionsNode) return

		warnOnMixedSource(optionsNode, source, mixedSourceWarnedRef)

		const anchorSelected = anchorSelectedOnOpenRef.current

		anchorSelectedOnOpenRef.current = false

		if (anchorSelected) {
			lastQueryRef.current = deferredQuery

			seatOnArrowOpen(optionsNode, source, multiple, activeIndexRef, inputRef)

			highlightOriginRef.current = 'moved'

			return
		}

		// A plain open re-seeds only once the query actually changes.
		if (lastQueryRef.current === deferredQuery) return

		lastQueryRef.current = deferredQuery

		seedTopMatch(optionsNode, source, activeIndexRef, inputRef)

		highlightOriginRef.current = 'seeded'
	}, [open, optionsNode, deferredQuery, multiple])

	// Async option swaps for an unchanged query (e.g. address suggestions
	// resolving) unmount the highlighted option while `deferredQuery`, the key
	// of the effect above, never changes; `aria-activedescendant` dangles.
	// The swap can also originate below this root (a query-context consumer
	// re-rendering on its own async state), where no render of this component
	// observes it; a MutationObserver on the options wrapper does.
	//
	// The origin of the highlight decides the move (see `reanchorOnOptionSwap`).
	// An empty highlight stays empty, a seeded one follows the top match, and a
	// moved one stays while its row exists.
	useEffect(() => {
		if (!open) return

		const node = optionsNode

		if (!node) return

		const observer = new MutationObserver(() =>
			reanchorOnOptionSwap(node, virtualSourceRef, activeIndexRef, inputRef, highlightOriginRef),
		)

		observer.observe(node, { childList: true, subtree: true })

		return () => observer.disconnect()
	}, [open, optionsNode])

	const { refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		// An outside press or an Escape closes through close(), as a blur does.
		onOpenChange: routeFloatingOpenChange(setOpenGuarded, close),
		matchReferenceWidth: true,
		// A panel taller than the space on its side of the trigger shrinks into that
		// space and scrolls, as a menu does.
		fitHeight: true,
		// The input and panel carry their own roles + popup wiring; `role: null`
		// suppresses floating-ui's wrapper roles.
		role: null,
	})

	const inputDisplay = resolveInputDisplay({
		editing,
		query,
		value,
		displayValue,
		summarize,
		multiple,
	})

	// The field shows how many are picked; this says which, on hover.
	const inputTitle = resolveInputTitle({ editing, value, displayValue, multiple })

	const inputHandlers = useComboboxInput<T>({
		multiple,
		clearOnEmpty,
		value,
		floatingRef: refs.floating,
		optionsRef,
		open,
		locked,
		setValue,
		setEditing,
		setQuery,
		setOpen: setOpenGuarded,
		openByArrowKey,
		close,
		keep: guardedKeep,
		onTouched: setTouched,
		keyboardSettled,
		rovingKeyDown,
		onPaste,
	})

	// The open guard lets a close through. Thus the trigger reads the lock
	// itself, so that a press under a controlled `open` does not close a locked
	// panel.
	const { onMouseDown: onSuffixMouseDown, onFrameMouseDown } = useComboboxTrigger({
		open,
		close,
		setOpen: setOpenGuarded,
		inputRef,
		isLocked,
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

	const hasValue = multiple
		? Array.isArray(value) && value.length > 0
		: value !== undefined && !Array.isArray(value)

	const showClear = clearable && hasValue && !locked

	const clearSuffix = showClear ? (
		<InputClearButton
			label="Clear selection"
			onMouseDown={(event) => event.stopPropagation()}
			onClick={(event) => {
				event.stopPropagation()

				setValue(multiple ? ([] as T[]) : undefined)

				// A handler owns the focus follow-up, so the default doesn't run first: the
				// input opens the menu on focus, and focusing only to be blurred back out
				// would flash the list open on the way past.
				if (onClear) {
					onClear(inputRef.current)

					return
				}

				// Nothing else can hold it: this button unmounts with the value it just
				// cleared, so without this focus falls to the body.
				inputRef.current?.focus()
			}}
		/>
	) : null

	// A controlled `open` can show the panel past the open guard, so the guard
	// also blocks the selection: a read-only or disabled combobox never commits.
	const guardedSelect = useCallback(
		(next: T) => {
			if (isLocked()) return

			select(next)
		},
		[isLocked, select],
	)

	// The input display reads the live `value`; the menu reads `selectionValue`,
	// which stays frozen until the panel finishes closing.
	const contextValue = useMemo(
		() => ({
			value: selectionValue,
			multiple,
			onSelect: guardedSelect as (v: unknown) => void,
			capitalize,
		}),
		[selectionValue, multiple, guardedSelect, capitalize],
	)

	// The menu content reads the frozen-through-close query so its filter (and a
	// deeply scrolled virtual window) holds steady during the exit animation; the
	// input display above still reads the live `value`.
	const queryValue = useQueryValue(menuQuery, menuDeferredQuery)

	return (
		<ComboboxContext value={contextValue}>
			<QueryContext value={queryValue}>
				{/* A filtering consumer reads the deferred query alone, so a keystroke
				    renders it one time and not also on the pass of the live query. */}
				<DeferredQueryContext value={menuDeferredQuery}>
					<SelectTrigger
						open={open}
						setReference={refs.setReference}
						getReferenceProps={getReferenceProps}
						glass={glass}
						size={size}
						className={className}
						data-group={dataGroup}
						data-group-orientation={dataGroupOrientation}
						data-slot={slot}
						frameProps={{
							// The rounded corners of the input do not take a press, so the
							// press falls through to the frame. The frame then toggles the
							// menu, as the chevron does.
							onMouseDown: onFrameMouseDown,
						}}
						prefix={prefix}
						suffix={suffix || clearSuffix || <Icon icon={<ChevronsUpDown />} />}
						suffixProps={{
							// Mouse-only toggle affordance; the input carries combobox
							// semantics. Only the default chevron is decorative enough to
							// hide from assistive tech — custom suffix content (e.g. a live
							// LoadingSpinner) owns its own semantics. Interactive suffix
							// content (the clear button) stops propagation to opt out.
							'aria-hidden': suffix || showClear ? undefined : true,
							onMouseDown: onSuffixMouseDown,
						}}
					>
						<ComboboxInput
							id={id}
							ref={inputRef}
							type="text"
							// The prop wins, then the Control, then 'off'. The default is not a
							// parameter default, because that counts as the prop and hides the
							// value of the Control.
							autoComplete={resolvedAutoComplete ?? 'off'}
							aria-label={ariaLabel}
							// In the accessible name, aria-labelledby wins over aria-label, so an
							// explicit aria-label removes it. The `<label>` of the field names the
							// input, so the input takes no fallback.
							aria-labelledby={ariaLabel ? undefined : ariaLabelledby}
							// Passed raw: the `<Input>` beneath runs the same `useControlProps`
							// merge, so resolving it here would join the field's ids twice.
							aria-describedby={ariaDescribedBy}
							open={open}
							controlsId={comboboxId}
							disabled={resolvedDisabled}
							readOnly={resolvedReadOnly}
							required={resolvedRequired}
							selected={hasValue}
							invalid={resolvedInvalid}
							value={inputDisplay}
							placeholder={placeholder}
							title={inputTitle}
							editing={editing}
							capitalize={capitalize}
							truncateTooltip={truncateTooltip}
							handlers={inputHandlers}
						/>
					</SelectTrigger>

					<ComboboxPanel
						id={comboboxId}
						open={open}
						editing={editing}
						multiple={multiple}
						glass={glass}
						size={size}
						ariaLabel={ariaLabel}
						// Names the listbox from the input's name: an explicit aria-label
						// wins, else aria-labelledby, else the field's Label (via Control).
						ariaLabelledby={ariaLabelledby ?? control?.labelledBy}
						floatingStyles={floatingStyles}
						getFloatingProps={getFloatingProps}
						optionsRef={attachOptions}
						setFloating={refs.setFloating}
						scrollToSelected={scrollToSelected}
						flushPending={flushPending}
						onClose={close}
					>
						<VirtualItemSourceContext value={virtualSourceRef}>{children}</VirtualItemSourceContext>
					</ComboboxPanel>
				</DeferredQueryContext>
			</QueryContext>
		</ComboboxContext>
	)
}
