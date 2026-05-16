'use client'

import { FloatingPortal, type Placement } from '@floating-ui/react'
import { ChevronsUpDown } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { type ReactNode, useId, useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useFloatingUI, useSelectableValueChange } from '../../hooks'
import { useControllable } from '../../hooks/use-controllable'
import { DENSITY_PRESETS, Density, useDensity } from '../../primitives/density'
import { useJoin } from '../../primitives/join'
import { PopoverPanel } from '../../primitives/popover'
import { iro, kokkaku } from '../../recipes'
import { k, listboxVariants } from '../../recipes/kata/listbox'
import { popover as kPopover } from '../../recipes/waku/popover'
import { type ControlSize, useControl } from '../control/context'
import { invalidAttrs } from '../control/control-invalid-attrs'
import { useGlass } from '../glass/context'
import { Icon } from '../icon'
import { Placeholder } from '../placeholder'
import { SelectTrigger } from '../select/select-trigger'
import { useSkeleton } from '../skeleton/context'
import { ListboxProvider } from './context'
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
	const join = useJoin()
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
				<button
					ref={triggerRef}
					id={resolvedId}
					type="button"
					role="combobox"
					aria-haspopup="listbox"
					aria-expanded={open}
					aria-controls={open ? listboxId : undefined}
					disabled={resolvedDisabled}
					data-slot="listbox-button"
					{...invalidAttrs(control?.invalid)}
					className={cn(listboxVariants({ density: token.density, size: token.size }))}
				>
					<span className={cn(k.value({ truncate }), tabularNums && 'tabular-nums')}>
						{label || <span className={cn(iro.text.muted)}>{placeholder}</span>}
					</span>
				</button>
			</SelectTrigger>

			<FloatingPortal>
				<AnimatePresence onExitComplete={flushPending}>
					{open && (
						<div
							ref={refs.setFloating}
							style={floatingStyles}
							className={kPopover.portal}
							{...getFloatingProps()}
						>
							<Density density={token.density} size={token.size}>
								<PopoverPanel
									id={listboxId}
									role="listbox"
									glass={glass}
									className={cn(k.panel, k.options)}
								>
									{children}
								</PopoverPanel>
							</Density>
						</div>
					)}
				</AnimatePresence>
			</FloatingPortal>
		</ListboxProvider>
	)
}
