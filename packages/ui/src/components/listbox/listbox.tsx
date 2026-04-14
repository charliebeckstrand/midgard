'use client'

import {
	autoUpdate,
	FloatingPortal,
	flip,
	offset,
	type Placement,
	shift,
	size,
	useDismiss,
	useFloating,
	useInteractions,
	useRole,
} from '@floating-ui/react'
import { ChevronsUpDown } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { useCallback, useId, useRef, useState } from 'react'
import { cn, createContext } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { useSelect } from '../../hooks/use-select'
import { FormControl, PopoverPanel } from '../../primitives'
import { sumi } from '../../recipes'
import { useControl } from '../control/context'
import { Icon } from '../icon'
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
	/** When true, clicking the selected option again clears the selection. */
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
	nullable = false,
	placeholder = 'Select',
	placement = 'bottom-start',
	icon,
	className,
	inputId,
	children,
}: ListboxProps<T>) {
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

	const [open, setOpen] = useState(false)
	const listboxId = useId()

	const triggerRef = useRef<HTMLButtonElement>(null)

	const { refs, floatingStyles, context } = useFloating({
		placement,
		open,
		onOpenChange: setOpen,
		whileElementsMounted: autoUpdate,
		middleware: [
			offset(4),
			flip(),
			shift({ padding: 8 }),
			size({
				apply({ rects, elements }) {
					Object.assign(elements.floating.style, {
						minWidth: `${rects.reference.width}px`,
					})
				},
			}),
		],
	})

	const dismiss = useDismiss(context)

	const role = useRole(context, { role: 'listbox' })

	const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role])

	const close = useCallback(() => {
		setOpen(false)

		triggerRef.current?.focus()
	}, [])

	const toggle = useSelect({ multiple, nullable, setValue })

	const pendingRef = useRef<{ value: T } | null>(null)

	const select = useCallback(
		(newValue: T) => {
			if (!multiple) {
				pendingRef.current = { value: newValue }
				close()
			} else {
				toggle(newValue)
			}
		},
		[multiple, toggle, close],
	)

	const flushPending = useCallback(() => {
		if (pendingRef.current) {
			toggle(pendingRef.current.value)

			pendingRef.current = null
		}
	}, [toggle])

	const label = (() => {
		if (multiple) {
			const arr = Array.isArray(value) ? value : []

			if (arr.length === 0) return undefined

			if (arr.length > 3) return `${arr.length} selected`

			if (displayValue) return arr.map((v) => displayValue(v as T)).join(', ')

			return `${arr.length} selected`
		}

		if (value !== undefined && displayValue) return displayValue(value as T)

		return undefined
	})()

	return (
		<ListboxProvider value={{ value, multiple, select: select as (v: unknown) => void, close }}>
			<div
				data-slot="control"
				ref={refs.setReference}
				className={cn(className)}
				{...getReferenceProps()}
			>
				<FormControl data-open={open || undefined}>
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
