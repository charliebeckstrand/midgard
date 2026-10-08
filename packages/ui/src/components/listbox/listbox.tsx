'use client'

import { ChevronsUpDown } from 'lucide-react'
import {
	type FocusEvent,
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useId,
	useMemo,
	useRef,
} from 'react'
import type { ScaleStep } from '../../core/density'
import { type FloatingPlacement, useFloatingUI, useSelectableValueChange } from '../../hooks'
import { SelectTrigger } from '../../primitives/select-trigger'
import { useGlass } from '../../providers/glass/context'
import type { scale } from '../../recipes/kata/listbox'
import type { GroupStampProps } from '../../types/group-stamp'
import { useControl } from '../control/context'
import { useControlProps } from '../control/use-control-props'
import { useFormValue } from '../form/use-form-value'
import { Icon } from '../icon'
import { InputClearButton } from '../input/input-clear-button'
import { ListboxContext } from './context'
import { ListboxButton } from './listbox-button'
import { ListboxPanel } from './listbox-panel'
import { resolveLabel } from './listbox-utilities'
import { useListboxState } from './use-listbox-state'

type ListboxBaseProps = GroupStampProps & {
	name?: string
	/** @defaultValue 'Select' */
	placeholder?: string
	/**
	 * Side and alignment of the panel. A `<side>-auto` value, such as
	 * `'bottom-auto'`, aligns the panel to the edge of the trigger that is nearer
	 * to the edge of the viewport.
	 * @defaultValue 'bottom-start'
	 */
	placement?: FloatingPlacement
	prefix?: ReactNode
	suffix?: ReactNode
	size?: ScaleStep<typeof scale>
	disabled?: boolean
	/**
	 * Keeps the trigger focusable and the value submitted, but blocks opening and
	 * selection. A controlled `open` can show the panel, but an option click does
	 * not commit, as with `disabled`.
	 */
	readOnly?: boolean
	/** Marks the field required; surfaces `aria-required` on the trigger. */
	required?: boolean
	className?: string
	/** Id for the trigger; matches the `id` prop on Combobox. Resolves through the explicit prop, then an enclosing `<Control>`/`<Field>`. */
	id?: string
	/**
	 * Names the trigger directly when no `<Field>`/`<Label>` wraps it. The
	 * combobox trigger's text is its value, not its name; a bare Listbox
	 * (e.g. in a toolbar) needs one of these to be reachable.
	 */
	'aria-label'?: string
	/** Consumer-supplied `aria-describedby`, merged ahead of the field's registered description/error ids. */
	'aria-describedby'?: string
	'aria-labelledby'?: string
	/** Clicking the selected option clears it. */
	nullable?: boolean
	/**
	 * Truncates the selected-value label when it overflows the trigger.
	 * Set `false` to let the trigger grow to fit its content. That suits a
	 * `<Group>` or another content-sized parent that collapses the label.
	 * @defaultValue true
	 */
	truncate?: boolean
	/**
	 * Show a clear button in place of the chevron when a value is selected. A
	 * custom `suffix` takes the slot before the clear button, as in Combobox.
	 * @defaultValue false
	 */
	clearable?: boolean
	/**
	 * Shows the whole selected label in a tooltip on hover while the trigger
	 * truncates it. The tooltip does not open while the panel is open. A touch
	 * press does not open it, as with any hover tooltip. A label that is not a
	 * string shows no tooltip.
	 * @defaultValue false
	 */
	truncateTooltip?: boolean
	/**
	 * Capitalizes the first letter (first word only) of each selected
	 * `displayValue` and of each option's string label; custom label nodes
	 * render as authored. Display-only: the underlying value is untouched.
	 * @defaultValue true
	 */
	capitalize?: boolean
	/** Controlled menu open state. */
	open?: boolean
	/** Fires when the menu open state changes. */
	onOpenChange?: (open: boolean) => void
	/**
	 * Fires when focus leaves the whole widget, with the trigger's blur event.
	 *
	 * The widget already computes this — it is what marks a bound field touched —
	 * and kept it. The prop bag is closed, with no rest spread and no `ref`, so a
	 * caller had no other way to hear it. A blur into the portaled panel is not a
	 * departure and never fires. That is the part a native `onBlur` on the trigger
	 * would get wrong. The panel is portaled, so focus moving into it reads as
	 * leaving the trigger.
	 */
	onBlur?: (event: FocusEvent<HTMLButtonElement>) => void
	/** Root slot identifier. Wrappers override it to stamp their own name. */
	'data-slot'?: string
	children: ReactNode
}

type ListboxSingleProps<T> = {
	/** Controlled value. `undefined` leaves the listbox uncontrolled; `null` keeps it controlled with no selection (CONVENTIONS §7.3). */
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

type ListboxMultipleProps<T> = {
	multiple: true
	value?: T[]
	defaultValue?: T[]
	onValueChange?: (value: T[]) => void
}

/**
 * Props for {@link Listbox}: the shared base (`name`, sizing, `clearable`,
 * `nullable`, open-state control, …) and an optional `displayValue` formatter.
 * They are discriminated on `multiple` into single- or array-valued value/handler shapes.
 *
 * @typeParam T - The option value type.
 */
export type ListboxProps<T> = ListboxBaseProps & {
	/**
	 * Gives the trigger label of a selected value. A string takes `capitalize` and
	 * the `truncateTooltip`. A node, such as a swatch next to a name, renders as
	 * written and shows no truncation tooltip.
	 */
	displayValue?: (value: T) => ReactNode
} & (ListboxSingleProps<T> | ListboxMultipleProps<T>)

/** True when the listbox holds a selection: a non-empty array in `multiple` mode, else a defined scalar. @internal */
function hasListboxValue<T>(value: T | T[] | undefined, multiple: boolean): boolean {
	return multiple
		? Array.isArray(value) && value.length > 0
		: value !== undefined && !Array.isArray(value)
}

/**
 * Select-style dropdown over arbitrary `<ListboxOption>` values: single or
 * `multiple` selection, controlled or uncontrolled, with an optional clear
 * control and a portaled panel. Binds to an enclosing Form field by `name`;
 * an explicit `value` wins over the bound field. The trigger and the panel
 * take the step of the nearest density scope, and an explicit `size` opens a
 * scope on each.
 */
export function Listbox<T>({
	name,
	value: valueProp,
	defaultValue,
	displayValue,
	onValueChange,
	multiple = false,
	nullable: nullableProp,
	placeholder = 'Select',
	placement = 'bottom-start',
	prefix,
	suffix,
	size,
	disabled,
	readOnly,
	required,
	className,
	id,
	truncate = true,
	truncateTooltip = false,
	clearable = false,
	capitalize = true,
	open: openProp,
	onOpenChange,
	onBlur,
	'data-group': dataGroup,
	'data-group-orientation': dataGroupOrientation,
	'aria-label': ariaLabel,
	'aria-labelledby': ariaLabelledby,
	'aria-describedby': ariaDescribedBy,
	'data-slot': slot = 'listbox',
	children,
}: ListboxProps<T>) {
	const glass = useGlass()
	const control = useControl()

	// Derived per render: while no value is held on either channel, clicking the
	// selected option clears it. Resolved here and not as a parameter default,
	// which the React Compiler cannot reorder.
	const nullable = nullableProp ?? (valueProp == null && defaultValue == null)

	// The shared control cascade: explicit props win, then the enclosing
	// `<Control>`. It also merges the consumer `aria-describedby` with the field's
	// registered ids and resolves `invalid` off the ambient severity, matching
	// Input/Textarea/Slider.
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
	// Listbox that withheld them rang only for a `<Field severity>` its consumer
	// set by hand — where the Input beside it rang for its own validator.
	const {
		id: resolvedId,
		disabled: resolvedDisabled,
		readOnly: resolvedReadOnly,
		required: resolvedRequired,
		'aria-describedby': describedBy,
		validation,
	} = useControlProps({
		id,
		disabled,
		readOnly,
		required,
		invalid: boundInvalid,
		'aria-describedby': ariaDescribedBy,
	})

	const listboxId = useId()

	const triggerRef = useRef<HTMLButtonElement>(null)

	const { open, setOpen, select, flushPending, selectionValue } = useListboxState<T>({
		multiple,
		nullable,
		value,
		open: openProp,
		onOpenChange,
		setValue,
	})

	// A read-only or disabled listbox does not open and does not commit.
	const locked = resolvedReadOnly || resolvedDisabled

	// readOnly keeps the trigger focusable and the value submitted but blocks
	// every open path (frame click, floating-ui keyboard/typeahead). disabled
	// blocks the same paths. The frame takes the click, not the disabled button.
	// Closing stays allowed, so an externally-opened menu can still dismiss.
	const setOpenGuarded = useCallback(
		(next: boolean) => {
			if (locked && next) return

			setOpen(next)
		},
		[locked, setOpen],
	)

	const { refs, floatingStyles, context, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange: setOpenGuarded,
		matchReferenceWidth: true,
		// A panel taller than the space on its side of the trigger shrinks into that
		// space and scrolls, as a menu does.
		fitHeight: true,
		returnFocusTo: triggerRef,
		// The trigger button (`role="combobox"`) and the panel (`role="listbox"`)
		// carry their own roles + popup wiring. Setting `role: null` prevents
		// floating-ui's positioning wrappers from stamping a duplicate role.
		role: null,
	})

	// Tab in either direction exits the composite widget in one keystroke (APG
	// select pattern). By the time the event bubbles here the focused option
	// has already committed itself (single-select). Closing through
	// `context.onOpenChange` with `'focus-out'` keeps `returnFocusTo` from
	// snapping focus back, and re-seating focus on the trigger before the
	// default action runs makes sequential focus navigation proceed from the
	// trigger: forward to the next tabbable, Shift+Tab to the previous. Left
	// to the focus manager, Shift+Tab lands on the trigger itself, costing a
	// second keystroke.
	// The handler, not the context that holds it: the engine rebuilds `context`
	// on every reposition, while `onOpenChange` keeps one identity for the mount
	// (see {@link useFloatingOutsidePress}).
	const { onOpenChange: onFloatingOpenChange } = context

	const handleTabOut = useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (event.key !== 'Tab') return

			onFloatingOpenChange(false, event.nativeEvent, 'focus-out')

			triggerRef.current?.focus()
		},
		[onFloatingOpenChange],
	)

	// Marks the bound field touched when focus leaves the widget; a blur into the
	// portaled panel (opening the menu) doesn't count. Mirrors the combobox
	// input's onBlur.
	//
	// The panel is found by its id as well as through the floating ref, because
	// the ref is not reliably attached at the moment this fires: a press opens the
	// menu on `click`, and the focus manager moves focus into the panel — raising
	// this blur — in the same beat the panel mounts. Where the ref was still null
	// the guard fell through and the field went touched on the way IN, so a picker
	// showed "required" the first time it was opened and before it was answered.
	const handleTriggerBlur = (event: FocusEvent<HTMLButtonElement>) => {
		// A blur to nowhere — a press on unfocusable ground — still leaves the
		// widget, so `null` falls through to the touch rather than short-circuiting.
		const next = event.relatedTarget as Node | null

		if (refs.floating.current?.contains(next)) return

		if (next !== null && document.getElementById(listboxId)?.contains(next)) return

		setTouched()

		// Past both guards the focus has genuinely left the widget, which is the
		// fact the caller could not reach.
		onBlur?.(event)
	}

	// The trigger button renders the label verbatim (`undefined` skips the placeholder).
	const label = resolveLabel({ value, displayValue, multiple, capitalize })

	const hasValue = hasListboxValue(value, multiple)

	const showClear = clearable && hasValue && !locked

	const clearSuffix = showClear ? (
		<InputClearButton
			label="Clear selection"
			onMouseDown={(event) => event.stopPropagation()}
			onClick={(event) => {
				event.stopPropagation()

				setValue(multiple ? ([] as T[]) : undefined)

				// The clear button unmounts once the selection is empty; focus
				// returns to the trigger instead of falling to <body> (WCAG 2.4.3).
				triggerRef.current?.focus()
			}}
		/>
	) : null

	// A controlled `open` can show the panel past the open guard, so the guard
	// also blocks the selection: a read-only or disabled listbox never commits.
	const guardedSelect = useCallback(
		(next: T) => {
			if (locked) return

			select(next)
		},
		[locked, select],
	)

	// The trigger label reads the live `value` (updates instantly on select); the
	// menu reads `selectionValue`, which stays frozen until the panel finishes
	// closing, keeping the selected row stable during the exit animation.
	const contextValue = useMemo(
		() => ({
			value: selectionValue,
			multiple,
			onSelect: guardedSelect as (v: unknown) => void,
			capitalize,
		}),
		[selectionValue, multiple, guardedSelect, capitalize],
	)

	return (
		<ListboxContext value={contextValue}>
			{/* `display: contents` wrapper: while open, `FloatingFocusManager` inserts a
			    hidden return-focus span as the reference's next sibling
			    (`domReference.insertAdjacentElement('afterend', …)`). Scoping the trigger
			    and panel under it keeps the control a single DOM child of its parent. A
			    `space-y`/`gap` container therefore doesn't shift when the panel opens.
			    `contents` leaves the trigger the flex/grid item it was. Mirrors `DatePicker`. */}
			<div className="contents">
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
						onClick: () => setOpenGuarded(!open),
						// While open, focus lives on the active option in the portaled panel. A
						// mousedown would pull it onto the button; if released off-target, no click
						// fires, stranding focus on the trigger and killing keyboard navigation.
						onMouseDown: open ? (event) => event.preventDefault() : undefined,
					}}
					prefix={prefix}
					suffix={suffix || clearSuffix || <Icon icon={<ChevronsUpDown />} />}
					suffixProps={
						suffix || showClear || resolvedDisabled
							? undefined
							: {
									// The default chevron is a sibling of the trigger, not part of
									// it; a bare mousedown blurs the focused trigger (focus only
									// returns on the click that follows). preventDefault keeps focus
									// on the trigger; the frame's onClick still toggles the menu.
									onMouseDown: (event) => event.preventDefault(),
								}
					}
				>
					<ListboxButton
						id={resolvedId}
						ref={triggerRef}
						open={open}
						controlsId={listboxId}
						ariaLabel={ariaLabel}
						ariaLabelledby={ariaLabelledby}
						describedBy={describedBy}
						disabled={resolvedDisabled}
						readOnly={resolvedReadOnly}
						required={resolvedRequired}
						validation={validation}
						label={label}
						onBlur={handleTriggerBlur}
						placeholder={placeholder}
						truncate={truncate}
						truncateTooltip={truncateTooltip}
						truncateTooltipSuppressed={open}
					/>
				</SelectTrigger>

				<ListboxPanel
					id={listboxId}
					open={open}
					glass={glass}
					multiple={multiple}
					size={size}
					ariaLabel={ariaLabel}
					// Names the listbox from the trigger's name: an explicit aria-label
					// wins, else aria-labelledby, else the field's Label (via Control).
					ariaLabelledby={ariaLabel ? undefined : (ariaLabelledby ?? control?.labelledBy)}
					floatingStyles={floatingStyles}
					context={context}
					getFloatingProps={getFloatingProps}
					setFloating={refs.setFloating}
					flushPending={flushPending}
					onTabOut={handleTabOut}
				>
					{children}
				</ListboxPanel>
			</div>
		</ListboxContext>
	)
}
