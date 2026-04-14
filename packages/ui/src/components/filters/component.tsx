'use client'

import type React from 'react'
import { Children, cloneElement, isValidElement, useCallback, useMemo } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks/use-controllable'
import { Flex } from '../flex'
import { type FiltersContextValue, FiltersProvider, useFilters } from './context'

// ── Helpers ────────────────────────────────────────

type FilterValue = Record<string, unknown>

function isActive(v: unknown): boolean {
	if (v === undefined || v === null || v === '') return false

	if (Array.isArray(v) && v.length === 0) return false

	return true
}

function isSyntheticEvent(v: unknown): v is React.SyntheticEvent<HTMLInputElement> {
	return v !== null && typeof v === 'object' && 'target' in v && 'nativeEvent' in v
}

// ── Filter ─────────────────────────────────────────

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
					direction={{ initial: 'row', md: 'column' }}
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

// ── FiltersField ───────────────────────────────────

export type FiltersFieldRenderProps = {
	value: unknown
	onChange: (value: unknown) => void
}

export type FiltersFieldProps = {
	name: string
	children: React.ReactNode | ((field: FiltersFieldRenderProps) => React.ReactNode)
	className?: string
}

export function FiltersField({ name, children, className }: FiltersFieldProps) {
	const { value: filterValue, setValue } = useFilters()

	const fieldValue = filterValue[name]

	const handleChange = useCallback(
		(valueOrEvent: unknown) => {
			if (isSyntheticEvent(valueOrEvent)) {
				const target = valueOrEvent.target as HTMLInputElement

				setValue(name, target.type === 'checkbox' ? target.checked : target.value)
			} else {
				setValue(name, valueOrEvent)
			}
		},
		[name, setValue],
	)

	const renderProps: FiltersFieldRenderProps = { value: fieldValue, onChange: handleChange }

	// Render prop pattern
	if (typeof children === 'function') {
		return (
			<div data-slot="filter-field" className={className}>
				{children(renderProps)}
			</div>
		)
	}

	// Clone element pattern — inject value + onChange
	// Pass null (not undefined) so children stay in controlled mode when cleared
	const child = Children.only(children)

	if (isValidElement(child)) {
		return (
			<div data-slot="filter-field" className={className}>
				{cloneElement(child as React.ReactElement<Record<string, unknown>>, {
					value: fieldValue ?? null,
					onChange: handleChange,
				})}
			</div>
		)
	}

	return (
		<div data-slot="filter-field" className={className}>
			{children}
		</div>
	)
}

// ── FiltersClear ───────────────────────────────────

export type FiltersClearProps = {
	children: React.ReactNode
	className?: string
}

export function FiltersClear({ children, className }: FiltersClearProps) {
	const { clear: handleClear } = useFilters()

	const child = Children.only(children)

	if (isValidElement<Record<string, unknown>>(child)) {
		return cloneElement(child, {
			onClick: handleClear,
			className: className
				? `${(child.props.className as string) ?? ''} ${className}`.trim()
				: child.props.className,
		})
	}

	return (
		<button data-slot="filter-clear" type="button" onClick={handleClear} className={className}>
			{children}
		</button>
	)
}
