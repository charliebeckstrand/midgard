'use client'

import type { Placement } from '@floating-ui/react'
import { ChevronsUpDown, X } from 'lucide-react'
import { type ReactNode, useId, useMemo, useRef } from 'react'
import { useFloatingUI, useSelectableValueChange } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { densityPresets, useDensity } from '../../primitives/density'
import { SelectTrigger } from '../../primitives/select-trigger'
import { useSkeleton } from '../../providers/skeleton'
import { Button } from '../button'
import { type ControlSize, useControl } from '../control/context'
import { ControlSkeleton } from '../control/control-skeleton'
import { useGlass } from '../glass/context'
import { Icon } from '../icon'
import { ListboxContext } from './context'
import { ListboxButton } from './listbox-button'
import { ListboxPanel } from './listbox-panel'
import { resolveLabel } from './listbox-utilities'
import { useListboxState } from './use-listbox-state'

type ListboxBaseProps = {
	placeholder?: string
	placement?: Placement
	prefix?: ReactNode
	suffix?: ReactNode
	size?: ControlSize
	disabled?: boolean
	className?: string
	inputId?: string
	/**
	 * Names the trigger directly when no `<Field>`/`<Label>` wraps it — the
	 * combobox trigger's text is its value, not its name, so a bare Listbox
	 * (e.g. in a toolbar) needs one of these to be reachable.
	 */
	'aria-label'?: string
	'aria-labelledby'?: string
	/** Clicking the selected option clears it. */
	nullable?: boolean
	/** Render the selected value with tabular numerals so digit changes don't shift layout. */
	tabularNums?: boolean
	/**
	 * Truncate the selected-value label when it overflows the trigger.
	 * Set `false` to let the trigger grow to fit its content — useful inside a
	 * `<Group>` or any other content-sized parent that would otherwise collapse
	 * the label. @default true
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

export function Listbox<T>({
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
	'data-slot': slot,
	children,
}: ListboxProps<T>) {
	const glass = useGlass()
	const control = useControl()
	const skeleton = useSkeleton()
	const inherited = useDensity()

	const token = size ? densityPresets[size] : inherited

	const resolvedId = inputId ?? control?.id

	const resolvedDisabled = disabled ?? control?.disabled

	const resolvedSize = token.size

	const handleValueChange = useSelectableValueChange<T>(
		onValueChange as ((value: T | T[] | undefined) => void) | undefined,
		multiple,
	)

	const [value, setValue] = useControllable<T | T[]>({
		value: valueProp,
		defaultValue: defaultValue as T | T[] | undefined,
		onValueChange: handleValueChange,
	})

	const listboxId = useId()

	const triggerRef = useRef<HTMLButtonElement>(null)

	const { open, setOpen, close, select, flushPending, selectionValue } = useListboxState<T>({
		multiple,
		nullable,
		value,
		open: openProp,
		onOpenChange,
		setValue,
	})

	const { refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange: setOpen,
		matchReferenceWidth: true,
		restoreFocusTo: triggerRef,
	})

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

				// The clear button unmounts once the selection is empty; return
				// focus to the trigger rather than dropping it to <body> (WCAG 2.4.3).
				triggerRef.current?.focus()
			}}
		>
			<Icon icon={<X />} />
		</Button>
	) : null

	// The trigger label reads the live `value` (updates instantly on select); the
	// menu reads `selectionValue`, which stays frozen until the panel finishes
	// closing so the selected row doesn't flicker during the exit animation.
	const contextValue = useMemo(
		() => ({ value: selectionValue, multiple, onSelect: select as (v: unknown) => void, close }),
		[selectionValue, multiple, select, close],
	)

	if (skeleton) {
		return <ControlSkeleton size={size} className={className} />
	}

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
					// fires — stranding focus on the trigger and killing keyboard navigation.
					onMouseDown: open ? (event) => event.preventDefault() : undefined,
				}}
				prefix={prefix}
				suffix={suffix || clearSuffix || <Icon icon={<ChevronsUpDown />} />}
			>
				<ListboxButton
					id={resolvedId}
					ref={triggerRef}
					open={open}
					controlsId={listboxId}
					ariaLabel={ariaLabel}
					ariaLabelledby={ariaLabelledby}
					describedBy={control?.describedBy}
					disabled={resolvedDisabled}
					invalid={control?.invalid}
					label={label}
					placeholder={placeholder}
					truncate={truncate}
					tabularNums={tabularNums}
					density={token.density}
					size={token.size}
				/>
			</SelectTrigger>

			<ListboxPanel
				id={listboxId}
				open={open}
				glass={glass}
				multiple={multiple}
				density={token.density}
				size={token.size}
				floatingStyles={floatingStyles}
				getFloatingProps={getFloatingProps}
				setFloating={refs.setFloating}
				flushPending={flushPending}
			>
				{children}
			</ListboxPanel>
		</ListboxContext>
	)
}
