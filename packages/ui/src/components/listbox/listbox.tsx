'use client'

import type { Placement } from '@floating-ui/react'
import { ChevronsUpDown } from 'lucide-react'
import { type ReactNode, useId, useMemo, useRef } from 'react'
import { useFloatingUI, useSelectableValueChange } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { DENSITY_PRESETS, useDensity } from '../../primitives/density'
import { type ControlSize, useControl } from '../control/context'
import { ControlSkeleton } from '../control/control-skeleton'
import { useGlass } from '../glass/context'
import { Icon } from '../icon'
import { SelectTrigger } from '../select/select-trigger'
import { useSkeleton } from '../skeleton/context'
import { ListboxProvider } from './context'
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
	'data-group'?: string
	'data-group-orientation'?: string
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
	'data-group': dataGroup,
	'data-group-orientation': dataGroupOrientation,
	children,
}: ListboxProps<T>) {
	const glass = useGlass()
	const control = useControl()
	const skeleton = useSkeleton()
	const inherited = useDensity()

	const token = size ? DENSITY_PRESETS[size] : inherited

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
		onChange: handleValueChange,
	})

	const listboxId = useId()

	const triggerRef = useRef<HTMLButtonElement>(null)

	const { open, setOpen, close, select, flushPending } = useListboxState<T>({
		multiple,
		nullable,
		setValue,
		triggerRef,
	})

	const { refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange: setOpen,
		matchReferenceWidth: true,
	})

	const label = resolveLabel({ value, displayValue, multiple })

	const contextValue = useMemo(
		() => ({ value, multiple, select: select as (v: unknown) => void, close }),
		[value, multiple, select, close],
	)

	if (skeleton) {
		return <ControlSkeleton size={size} className={className} />
	}

	return (
		<ListboxProvider value={contextValue}>
			<SelectTrigger
				open={open}
				setReference={refs.setReference}
				getReferenceProps={getReferenceProps}
				glass={glass}
				size={resolvedSize}
				className={className}
				data-group={dataGroup}
				data-group-orientation={dataGroupOrientation}
				frameProps={{ onClick: () => setOpen(!open) }}
				prefix={prefix}
				suffix={suffix || <Icon icon={<ChevronsUpDown />} />}
			>
				<ListboxButton
					id={resolvedId}
					ref={triggerRef}
					open={open}
					controlsId={listboxId}
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
				density={token.density}
				size={token.size}
				floatingStyles={floatingStyles}
				getFloatingProps={getFloatingProps}
				setFloating={refs.setFloating}
				flushPending={flushPending}
			>
				{children}
			</ListboxPanel>
		</ListboxProvider>
	)
}
