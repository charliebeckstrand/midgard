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
	selectButtonVariants,
	selectChevronVariants,
	selectOptionsVariants,
	selectValueVariants,
} from './variants'

type SelectContextValue<T = unknown> = {
	value: T | undefined
	select: (value: T) => void
	close: () => void
}

export const [SelectProvider, useSelectContext] = createContext<SelectContextValue>('Select')

export type SelectProps<T> = {
	value?: T
	defaultValue?: T
	onChange?: (value: T) => void
	placeholder?: string
	displayValue?: (value: T) => string
	anchor?: keyof typeof narabi.anchor
	icon?: React.ReactNode
	className?: string
	inputId?: string
	children: React.ReactNode
}

export function Select<T>({
	value: valueProp,
	defaultValue,
	onChange,
	placeholder = 'Select...',
	displayValue,
	anchor = 'bottom start',
	icon,
	className,
	inputId,
	children,
}: SelectProps<T>) {
	const [value, setValue] = useControllable<T>({
		value: valueProp,
		defaultValue,
		onChange,
	})

	const [open, setOpen] = useState(false)

	const triggerRef = useRef<HTMLButtonElement>(null)
	const pendingValue = useRef<T | undefined>(undefined)

	const close = useCallback(() => {
		setOpen(false)

		triggerRef.current?.focus()
	}, [])

	const select = useCallback(
		(newValue: T) => {
			pendingValue.current = newValue

			close()
		},
		[close],
	)

	const onExitComplete = useCallback(() => {
		if (pendingValue.current !== undefined) {
			setValue(pendingValue.current)

			pendingValue.current = undefined
		}
	}, [setValue])

	const containerRef = useOverlay(open, close)

	const label = value !== undefined && displayValue ? displayValue(value as T) : undefined

	return (
		<SelectProvider value={{ value, select: select as (v: unknown) => void, close }}>
			<div data-slot="control" className={cn('relative', className)}>
				<FormControl data-open={open || undefined}>
					<button
						ref={triggerRef}
						id={inputId}
						type="button"
						role="combobox"
						aria-haspopup="listbox"
						aria-expanded={open}
						data-slot="select-button"
						onClick={() => setOpen(!open)}
						className={cn(selectButtonVariants())}
					>
						<span className={selectValueVariants()}>
							{label ?? <span className={cn(sumi.textMuted)}>{placeholder}</span>}
						</span>
						<span className={selectChevronVariants()}>{icon ?? <ChevronIcon />}</span>
					</button>
				</FormControl>

				<AnimatePresence onExitComplete={onExitComplete}>
					{open && (
						<div ref={containerRef}>
							<PopoverPanel
								role="listbox"
								className={cn(narabi.anchor[anchor], selectOptionsVariants())}
							>
								{children}
							</PopoverPanel>
						</div>
					)}
				</AnimatePresence>
			</div>
		</SelectProvider>
	)
}
