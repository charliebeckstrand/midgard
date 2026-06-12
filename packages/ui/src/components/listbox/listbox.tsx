'use client'

import type { Placement } from '@floating-ui/react'
import { ChevronsUpDown, X } from 'lucide-react'
import {
	type FocusEvent,
	type KeyboardEvent,
	type ReactNode,
	useCallback,
	useId,
	useMemo,
	useRef,
} from 'react'
import { useAriaIds, useFloatingUI, useSelectableValueChange } from '../../hooks'
import { useControlSize } from '../../primitives/density'
import { SelectTrigger } from '../../primitives/select-trigger'
import { useGlass } from '../../providers/glass/context'
import { Button } from '../button'
import { type ControlSize, useControl } from '../control/context'
import { useFormValue } from '../form/use-form-value'
import { Icon } from '../icon'
import { ListboxContext } from './context'
import { ListboxButton } from './listbox-button'
import { ListboxPanel } from './listbox-panel'
import { resolveLabel } from './listbox-utilities'
import { useListboxState } from './use-listbox-state'

type ListboxBaseProps = {
	name?: string
	placeholder?: string
	placement?: Placement
	prefix?: ReactNode
	suffix?: ReactNode
	size?: ControlSize
	disabled?: boolean
	className?: string
	inputId?: string
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
	/** Renders the selected value with tabular numerals; digit changes do not shift layout. */
	tabularNums?: boolean
	/**
	 * Truncates the selected-value label when it overflows the trigger.
	 * Set `false` to let the trigger grow to fit its content, e.g. inside a
	 * `<Group>` or another content-sized parent that collapses the label.
	 * @default true
	 */
	truncate?: boolean
	/** Show a clear button in place of the chevron when a value is selected. */
	clearable?: boolean
	/** Controlled menu open state. */
	open?: boolean
	/** Fires when the menu open state changes. */
	onOpenChange?: (open: boolean) => void
	'data-group'?: string
	'data-group-orientation'?: string
	/** Root slot identifier. Wrappers override it to stamp their own name. */
	'data-slot'?: string
	children: ReactNode
}

type ListboxSingleProps<T> = {
	multiple?: false
	value?: T
	defaultValue?: T
	onValueChange?: (value: T | undefined) => void
}

type ListboxMultipleProps<T> = {
	multiple: true
	value?: T[]
	defaultValue?: T[]
	onValueChange?: (value: T[]) => void
}

export type ListboxProps<T> = ListboxBaseProps & {
	displayValue?: (value: T) => string
} & (ListboxSingleProps<T> | ListboxMultipleProps<T>)

/**
 * Select-style dropdown over arbitrary `<ListboxOption>` values: single or
 * `multiple` selection, controlled or uncontrolled, with an optional clear
 * control and a portalled panel. Binds to an enclosing Form field by `name`;
 * an explicit `value` wins over the bound field. `size` resolves from the
 * prop, then `<Control>`, then enclosing Density.
 */
export function Listbox<T>({
	name,
	value: valueProp,
	defaultValue,
	displayValue,
	onValueChange,
	multiple = false,
	nullable = valueProp === undefined && defaultValue === undefined,
	placeholder = 'Select',
	placement = 'bottom-start',
	prefix,
	suffix,
	size,
	disabled,
	className,
	inputId,
	tabularNums,
	truncate = true,
	clearable = false,
	open: openProp,
	onOpenChange,
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
	const token = useControlSize(size)

	const resolvedId = inputId ?? control?.id

	const resolvedDisabled = disabled ?? control?.disabled

	// Merges a consumer aria-describedby with the field's registered ids,
	// matching Input/Textarea/Checkbox.
	const describedBy = useAriaIds(ariaDescribedBy, control?.describedBy)

	const resolvedSize = token.size

	const handleValueChange = useSelectableValueChange<T>(
		onValueChange as ((value: T | T[] | undefined) => void) | undefined,
		multiple,
	)

	const { value, setValue, setTouched } = useFormValue<T | T[]>(name, {
		value: valueProp,
		defaultValue: defaultValue as T | T[] | undefined,
		onValueChange: handleValueChange,
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

	const { refs, floatingStyles, context, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange: setOpen,
		matchReferenceWidth: true,
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
	const handleTabOut = useCallback(
		(event: KeyboardEvent<HTMLElement>) => {
			if (event.key !== 'Tab') return

			context.onOpenChange(false, event.nativeEvent, 'focus-out')

			triggerRef.current?.focus()
		},
		[context],
	)

	// Marks the bound field touched when focus leaves the widget; a blur into
	// the portalled panel (opening the menu) doesn't count. Mirrors the
	// combobox input's onBlur.
	const handleTriggerBlur = (event: FocusEvent<HTMLButtonElement>) => {
		if (refs.floating.current?.contains(event.relatedTarget as Node)) return

		setTouched()
	}

	const label = resolveLabel({ value, displayValue, multiple })

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

				// The clear button unmounts once the selection is empty; focus
				// returns to the trigger instead of falling to <body> (WCAG 2.4.3).
				triggerRef.current?.focus()
			}}
		>
			<Icon icon={<X />} />
		</Button>
	) : null

	// The trigger label reads the live `value` (updates instantly on select); the
	// menu reads `selectionValue`, which stays frozen until the panel finishes
	// closing, keeping the selected row stable during the exit animation.
	const contextValue = useMemo(
		() => ({ value: selectionValue, multiple, onSelect: select as (v: unknown) => void }),
		[selectionValue, multiple, select],
	)

	return (
		<ListboxContext value={contextValue}>
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
				frameProps={{
					onClick: () => setOpen(!open),
					// While open, focus lives on the active option in the portalled panel. A
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
					invalid={control?.invalid}
					label={label}
					onBlur={handleTriggerBlur}
					placeholder={placeholder}
					truncate={truncate}
					tabularNums={tabularNums}
					density={token.space}
					size={token.size}
				/>
			</SelectTrigger>

			<ListboxPanel
				id={listboxId}
				open={open}
				glass={glass}
				multiple={multiple}
				density={token.space}
				size={token.size}
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
		</ListboxContext>
	)
}
