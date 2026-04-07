'use client'

import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { useCallback, useRef, useState } from 'react'
import { cn, createContext } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { useOverlay } from '../../hooks/use-overlay'
import { ChevronIcon } from '../../icons'
import { FormControl, PopoverPanel } from '../../primitives'
import { narabi, sumi } from '../../recipes'
import {
	listboxButtonVariants,
	listboxChevronVariants,
	listboxOptionsVariants,
	listboxValueVariants,
} from './variants'

type ListboxContextValue<T = unknown> = {
	value: T | T[] | undefined
	multiple: boolean
	select: (value: T) => void
	close: () => void
}

export const [ListboxProvider, useListboxContext] = createContext<ListboxContextValue>('Listbox')

type ListboxBaseProps = {
	placeholder?: string
	anchor?: keyof typeof narabi.anchor
	icon?: React.ReactNode
	className?: string
	inputId?: string
	children: React.ReactNode
}

export type ListboxProps<T> = ListboxBaseProps &
	(
		| {
				multiple?: false
				value?: T
				defaultValue?: T
				onChange?: (value: T) => void
				displayValue?: (value: T) => string
		  }
		| {
				multiple: true
				value?: T[]
				defaultValue?: T[]
				onChange?: (value: T[]) => void
				displayValue?: (value: T) => string
		  }
	)

export function Listbox<T>({
	value: valueProp,
	defaultValue,
	onChange,
	multiple = false,
	placeholder = 'Select...',
	displayValue,
	anchor = 'bottom start',
	icon,
	className,
	inputId,
	children,
}: ListboxProps<T>) {
	const [value, setValue] = useControllable<T | T[]>({
		value: valueProp,
		defaultValue: defaultValue as T | T[] | undefined,
		onChange: onChange as ((value: T | T[]) => void) | undefined,
	})

	const [open, setOpen] = useState(false)

	const triggerRef = useRef<HTMLButtonElement>(null)
	const pendingValue = useRef<T | T[] | undefined>(undefined)

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
				pendingValue.current = newValue

				close()
			}
		},
		[multiple, value, setValue, close],
	)

	const onExitComplete = useCallback(() => {
		if (pendingValue.current !== undefined) {
			setValue(pendingValue.current)

			pendingValue.current = undefined
		}
	}, [setValue])

	const containerRef = useOverlay(open, close)

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
			<div data-slot="control" className={cn('relative', className)}>
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
						className={cn(listboxButtonVariants())}
					>
						<span className={listboxValueVariants()}>
							{label ?? <span className={cn(sumi.textMuted)}>{placeholder}</span>}
						</span>
						<span className={listboxChevronVariants()}>{icon ?? <ChevronIcon />}</span>
					</button>
				</FormControl>

				<AnimatePresence onExitComplete={onExitComplete}>
					{open && (
						<div ref={containerRef}>
							<PopoverPanel
								role="listbox"
								className={cn(narabi.anchor[anchor], listboxOptionsVariants())}
							>
								{children}
							</PopoverPanel>
						</div>
					)}
				</AnimatePresence>
			</div>
		</ListboxProvider>
	)
}
