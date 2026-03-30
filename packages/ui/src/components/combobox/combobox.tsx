'use client'

import { AnimatePresence } from 'motion/react'
import type React from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { cn, createContext } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { useMenuKeyboard } from '../../hooks/use-menu-keyboard'
import { useOverlay } from '../../hooks/use-overlay'
import { ChevronIcon, PopoverPanel } from '../../primitives'
import { narabi } from '../../recipes'
import { comboboxInputVariants, comboboxOptionsVariants, comboboxVariants } from './variants'

type ComboboxContextValue<T = unknown> = {
	value: T | undefined
	select: (value: T) => void
	query: string
}

export const [ComboboxProvider, useComboboxContext] =
	createContext<ComboboxContextValue>('Combobox')

export type ComboboxProps<T> = {
	value?: T
	defaultValue?: T
	onChange?: (value: T) => void
	placeholder?: string
	displayValue?: (value: T) => string
	anchor?: keyof typeof narabi.anchor
	className?: string
	children: React.ReactNode | ((query: string) => React.ReactNode)
}

export function Combobox<T>({
	value: valueProp,
	defaultValue,
	onChange,
	placeholder = 'Search...',
	displayValue,
	anchor = 'bottom start',
	className,
	children,
}: ComboboxProps<T>) {
	const [value, setValue] = useControllable<T>({
		value: valueProp,
		defaultValue,
		onChange,
	})

	const [query, setQuery] = useState('')
	const [open, setOpen] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)
	const optionsRef = useRef<HTMLDivElement>(null)

	const handleKeyDown = useMenuKeyboard(optionsRef, '[role="option"]:not([data-disabled])')

	const close = useCallback(() => {
		setOpen(false)
		setQuery('')
	}, [])

	const select = useCallback(
		(newValue: T) => {
			setValue(newValue)
			close()
			inputRef.current?.focus()
		},
		[setValue, close],
	)

	const inputDisplay = useMemo(() => {
		if (query) return query
		if (value !== undefined && displayValue) return displayValue(value)
		return ''
	}, [query, value, displayValue])

	const containerRef = useOverlay(open, close)

	const rendered = typeof children === 'function' ? children(query) : children

	return (
		<ComboboxProvider value={{ value, select: select as (v: unknown) => void, query }}>
			<div ref={containerRef} data-slot="combobox" className={cn('relative', className)}>
				<span className={cn(comboboxVariants())}>
					<input
						ref={inputRef}
						type="text"
						role="combobox"
						aria-haspopup="listbox"
						aria-expanded={open}
						aria-autocomplete="list"
						data-slot="combobox-input"
						value={inputDisplay}
						placeholder={placeholder}
						onChange={(e) => {
							setQuery(e.target.value)
							setOpen(true)
						}}
						onFocus={() => setOpen(true)}
						onKeyDown={(e) => {
							if (e.key === 'Escape') {
								close()
								return
							}
							handleKeyDown(e)
						}}
						className={cn(comboboxInputVariants())}
					/>
					<button
						type="button"
						tabIndex={-1}
						aria-hidden="true"
						onClick={() => setOpen(!open)}
						className="absolute inset-y-0 right-0 flex items-center pr-2"
					>
						<ChevronIcon />
					</button>
				</span>

				<div ref={optionsRef}>
					<AnimatePresence>
						{open && (
							<PopoverPanel
								role="listbox"
								autoFocus={false}
								className={cn(narabi.anchor[anchor], comboboxOptionsVariants())}
								onKeyDown={(e) => {
									if (e.key === 'Escape') close()
								}}
							>
								{rendered}
							</PopoverPanel>
						)}
					</AnimatePresence>
				</div>
			</div>
		</ComboboxProvider>
	)
}
