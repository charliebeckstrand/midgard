'use client'

import type React from 'react'
import { useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { Flex } from '../flex'
import { type FiltersContextValue, FiltersProvider } from './context'

// ── Helpers ────────────────────────────────────────

type FilterValue = Record<string, unknown>

function isActive(v: unknown): boolean {
	if (v === undefined || v === null || v === '') return false

	if (Array.isArray(v) && v.length === 0) return false

	return true
}

// ── Filters ─────────────────────────────────────────

export type FiltersProps<T extends FilterValue = FilterValue> = {
	value?: T
	defaultValue?: T
	onChange?: (value: T) => void
	onClear?: () => void
	clear?: React.ReactNode
	affix?: React.ReactNode
	suffix?: React.ReactNode
	children: React.ReactNode
	className?: string
}

export function Filters<T extends FilterValue = FilterValue>({
	value: valueProp,
	defaultValue,
	onChange,
	onClear,
	clear,
	affix,
	suffix,
	children,
	className,
}: FiltersProps<T>) {
	const [state, setState] = useControllable<T>({
		value: valueProp,
		defaultValue: defaultValue ?? ({} as T),
		onChange: onChange as ((value: T | undefined) => void) | undefined,
	})

	const filterValue = (state ?? {}) as T

	const setValue = useCallback(
		(name: string, fieldValue: unknown) => {
			setState((prev) => ({ ...(prev ?? ({} as T)), [name]: fieldValue }) as T)
		},
		[setState],
	)

	const handleClear = useCallback(() => {
		if (defaultValue) {
			setState(defaultValue)
		} else {
			setState((prev) => {
				const cleared = {} as Record<string, undefined>

				for (const key of Object.keys(prev ?? {})) cleared[key] = undefined

				return cleared as T
			})
		}
		onClear?.()
	}, [defaultValue, setState, onClear])

	const activeCount = useMemo(
		() => Object.values(filterValue).filter(isActive).length,
		[filterValue],
	)

	const ctx: FiltersContextValue = useMemo(
		() => ({ value: filterValue, setValue, clear: handleClear, onClear, activeCount }),
		[filterValue, setValue, handleClear, onClear, activeCount],
	)

	return (
		<FiltersProvider value={ctx}>
			<div data-slot="filters" className={cn('flex flex-col gap-4', className)}>
				{affix && <div data-slot="filters-affix">{affix}</div>}
				<Flex
					direction={{ initial: 'row', sm: 'col' }}
					gap={2}
					align={{ initial: 'end', md: 'start' }}
				>
					{children}
					{clear && <Flex>{clear}</Flex>}
				</Flex>
				{suffix && <div data-slot="filters-suffix">{suffix}</div>}
			</div>
		</FiltersProvider>
	)
}
