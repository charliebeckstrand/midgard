'use client'

import { FloatingPortal, type Placement } from '@floating-ui/react'
import { ChevronsUpDown } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { useCallback, useId, useRef } from 'react'
import { cn, createContext } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { useFloatingUI } from '../../hooks/use-floating-ui'
import { FormControl, PopoverPanel } from '../../primitives'
import { sumi, waku } from '../../recipes'
import { useControl } from '../control/context'
import { useGlass } from '../glass/context'
import { Icon } from '../icon'
import { useListboxSelection } from './use-listbox-selection'
import { resolveLabel } from './utilities'
import { k, kPopover } from './variants'

type ListboxContextValue<T = unknown> = {
	value: T | T[] | undefined
	multiple: boolean
	select: (value: T) => void
	close: () => void
}

export const [ListboxProvider, useListboxContext] = createContext<ListboxContextValue>('Listbox')

type ListboxBaseProps = {
	placeholder?: string
	placement?: Placement
	icon?: React.ReactNode
	className?: string
	inputId?: string
	/** Clicking the selected option clears it. */
	nullable?: boolean
	children: React.ReactNode
}

type ListboxSingleProps<T> = {
	multiple?: false
	value?: T
	defaultValue?: T
	onChange?: (value: T | undefined) => void
}

type ListboxMultipleProps<T> = {
	multiple: true
	value?: T[]
	defaultValue?: T[]
	onChange?: (value: T[]) => void
}

export type ListboxProps<T> = ListboxBaseProps & {
	displayValue?: (value: T) => string
} & (ListboxSingleProps<T> | ListboxMultipleProps<T>)

export function Listbox<T>({
	value: valueProp,
	defaultValue,
	displayValue,
	onChange,
	multiple = false,
	nullable = valueProp === undefined && defaultValue === undefined,
	placeholder = 'Select',
	placement = 'bottom-start',
	icon,
	className,
	inputId,
	children,
}: ListboxProps<T>) {
	const glass = useGlass()
	const control = useControl()

	const resolvedId = inputId ?? control?.id

	const resolvedDisabled = control?.disabled

	const handleValueChange = useCallback(
		(nextValue: T | T[] | undefined) => {
			if (nextValue === undefined && multiple) return

			;(onChange as ((value: T | T[] | undefined) => void) | undefined)?.(nextValue)
		},
		[onChange, multiple],
	)

	const [value, setValue] = useControllable<T | T[]>({
		value: valueProp,
		defaultValue: defaultValue as T | T[] | undefined,
		onChange: handleValueChange,
	})

	const listboxId = useId()

	const triggerRef = useRef<HTMLButtonElement>(null)

	const { open, setOpen, close, select, flushPending } = useListboxSelection<T>({
		multiple,
		nullable,
		setValue,
		triggerRef,
	})

	const { refs, floatingStyles, getReferenceProps, getFloatingProps } = useFloatingUI({
		placement,
		open,
		onOpenChange: setOpen,
	})

	const label = resolveLabel({ value, displayValue, multiple })

	return (
		<ListboxProvider value={{ value, multiple, select: select as (v: unknown) => void, close }}>
			<div
				data-slot="control"
				ref={refs.setReference}
				className={cn(className)}
				{...getReferenceProps()}
			>
				<FormControl data-open={open || undefined} className={cn(!glass && waku.control.surface)}>
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
						{...(control?.invalid ? { 'data-invalid': '', 'aria-invalid': true } : {})}
						onClick={() => setOpen(!open)}
						className={cn(k.button)}
					>
						<span className={k.value}>
							{label || <span className={cn(sumi.textMuted)}>{placeholder}</span>}
						</span>
						<span className={cn(k.chevron)}>
							{icon ?? <Icon icon={<ChevronsUpDown />} size="sm" />}
						</span>
					</button>
				</FormControl>
			</div>

			<FloatingPortal>
				<AnimatePresence onExitComplete={flushPending}>
					{open && (
						<div
							ref={refs.setFloating}
							style={floatingStyles}
							className={kPopover.portal}
							{...getFloatingProps()}
						>
							<PopoverPanel id={listboxId} role="listbox" className={cn(k.panel, k.options)}>
								{children}
							</PopoverPanel>
						</div>
					)}
				</AnimatePresence>
			</FloatingPortal>
		</ListboxProvider>
	)
}
