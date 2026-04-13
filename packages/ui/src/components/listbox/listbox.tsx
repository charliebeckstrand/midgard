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
import { useCallback, useRef, useState } from 'react'
import { cn, createContext } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { FormControl, PopoverPanel } from '../../primitives'
import { katachi, sumi } from '../../recipes'
import { Icon } from '../icon'

const k = katachi.listbox

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
	placeholder = 'Select',
	placement = 'bottom-start',
	icon,
	className,
	inputId,
	children,
}: ListboxProps<T>) {
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

	const triggerRef = useRef<HTMLButtonElement>(null)

	const pendingValue = useRef<T | T[] | undefined>(undefined)

	const hasPendingValue = useRef(false)

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

	const select = useCallback(
		(newValue: T) => {
			if (multiple) {
				const arr = (Array.isArray(value) ? value : []) as T[]

				const next = arr.includes(newValue) ? arr.filter((v) => v !== newValue) : [...arr, newValue]

				setValue(next)
			} else {
				pendingValue.current = value === newValue ? undefined : newValue

				hasPendingValue.current = true

				close()
			}
		},
		[multiple, value, setValue, close],
	)

	const onExitComplete = useCallback(() => {
		if (hasPendingValue.current) {
			setValue(pendingValue.current)

			pendingValue.current = undefined

			hasPendingValue.current = false
		}
	}, [setValue])

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
						id={inputId}
						type="button"
						role="combobox"
						aria-haspopup="listbox"
						aria-expanded={open}
						data-slot="listbox-button"
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
				<AnimatePresence onExitComplete={onExitComplete}>
					{open && (
						<div
							ref={refs.setFloating}
							style={floatingStyles}
							className={katachi.popover.portal}
							{...getFloatingProps()}
						>
							<PopoverPanel role="listbox" className={cn(k.panel, k.options)}>
								{children}
							</PopoverPanel>
						</div>
					)}
				</AnimatePresence>
			</FloatingPortal>
		</ListboxProvider>
	)
}
