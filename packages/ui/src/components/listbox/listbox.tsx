'use client'

import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { useCallback, useRef, useState } from 'react'
import { cn, createContext } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { useOverlay } from '../../hooks/use-overlay'
import { ChevronIcon, PopoverPanel } from '../../primitives'
import { narabi } from '../../recipes'
import { listboxButtonVariants, listboxOptionsVariants, listboxVariants } from './variants'

type ListboxContextValue<T = unknown> = {
	value: T | undefined
	select: (value: T) => void
	close: () => void
}

export const [ListboxProvider, useListboxContext] = createContext<ListboxContextValue>('Listbox')

export type ListboxProps<T> = {
	value?: T
	defaultValue?: T
	onChange?: (value: T) => void
	placeholder?: string
	displayValue?: (value: T) => string
	anchor?: keyof typeof narabi.anchor
	className?: string
	children: React.ReactNode
}

export function Listbox<T>({
	value: valueProp,
	defaultValue,
	onChange,
	placeholder = 'Select...',
	displayValue,
	anchor = 'bottom start',
	className,
	children,
}: ListboxProps<T>) {
	const [value, setValue] = useControllable<T>({
		value: valueProp,
		defaultValue,
		onChange,
	})

	const [open, setOpen] = useState(false)
	const triggerRef = useRef<HTMLButtonElement>(null)

	const close = useCallback(() => {
		setOpen(false)
		triggerRef.current?.focus()
	}, [])

	const select = useCallback(
		(newValue: T) => {
			setValue(newValue)
			close()
		},
		[setValue, close],
	)

	const containerRef = useOverlay(open, close)

	const label = value !== undefined && displayValue ? displayValue(value) : undefined

	return (
		<ListboxProvider value={{ value, select: select as (v: unknown) => void, close }}>
			<div data-slot="listbox" className={cn('relative', className)}>
				<span className={cn(listboxVariants())}>
					<button
						ref={triggerRef}
						type="button"
						role="combobox"
						aria-haspopup="listbox"
						aria-expanded={open}
						data-slot="listbox-button"
						onClick={() => setOpen(!open)}
						className={cn(listboxButtonVariants())}
					>
						<span className="block truncate">
							{label ?? <span className="text-zinc-500">{placeholder}</span>}
						</span>
						<span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
							<ChevronIcon />
						</span>
					</button>
				</span>

				<AnimatePresence>
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
