'use client'

import { Children, cloneElement, isValidElement, useCallback, useMemo } from 'react'
import { useControllable } from '../../hooks/use-controllable'
import { type FilterContextValue, FilterProvider, useFilter } from './context'

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

export type FilterProps<T extends FilterValue = FilterValue> = {
	value?: T
	defaultValue?: T
	onChange?: (value: T | undefined) => void
	children: React.ReactNode
	className?: string
}

export function Filter<T extends FilterValue = FilterValue>({
	value: valueProp,
	defaultValue,
	onChange,
	children,
	className,
}: FilterProps<T>) {
	const [state, setState] = useControllable<T>({
		value: valueProp,
		defaultValue: defaultValue ?? ({} as T),
		onChange,
	})

	const filterValue = (state ?? {}) as T

	const setValue = useCallback(
		(name: string, fieldValue: unknown) => {
			setState((prev) => ({ ...(prev ?? ({} as T)), [name]: fieldValue }) as T)
		},
		[setState],
	)

	const clear = useCallback(() => {
		if (defaultValue) {
			setState(defaultValue)
		} else {
			setState((prev) => {
				const cleared = {} as Record<string, unknown>
				for (const key of Object.keys(prev ?? {})) {
					cleared[key] = undefined
				}
				return cleared as T
			})
		}
	}, [defaultValue, setState])

	const activeCount = useMemo(
		() => Object.values(filterValue).filter(isActive).length,
		[filterValue],
	)

	const ctx: FilterContextValue = useMemo(
		() => ({ value: filterValue, setValue, clear, activeCount }),
		[filterValue, setValue, clear, activeCount],
	)

	return (
		<FilterProvider value={ctx}>
			<div data-slot="filter" className={className}>
				{children}
			</div>
		</FilterProvider>
	)
}

// ── FilterField ────────────────────────────────────

export type FilterFieldRenderProps = {
	value: unknown
	onChange: (value: unknown) => void
}

export type FilterFieldProps = {
	name: string
	children: React.ReactNode | ((field: FilterFieldRenderProps) => React.ReactNode)
	className?: string
}

export function FilterField({ name, children, className }: FilterFieldProps) {
	const { value: filterValue, setValue } = useFilter()
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

	const renderProps: FilterFieldRenderProps = { value: fieldValue, onChange: handleChange }

	// Render prop pattern
	if (typeof children === 'function') {
		return (
			<div data-slot="filter-field" className={className}>
				{children(renderProps)}
			</div>
		)
	}

	// Clone element pattern — inject value + onChange
	const child = Children.only(children)
	if (isValidElement(child)) {
		return (
			<div data-slot="filter-field" className={className}>
				{cloneElement(child as React.ReactElement<Record<string, unknown>>, {
					value: fieldValue,
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

// ── FilterClear ────────────────────────────────────

export type FilterClearProps = {
	children: React.ReactNode
	className?: string
}

export function FilterClear({ children, className }: FilterClearProps) {
	const { clear } = useFilter()

	const child = Children.only(children)
	if (isValidElement<Record<string, unknown>>(child)) {
		return cloneElement(child, {
			onClick: clear,
			className: className
				? `${(child.props.className as string) ?? ''} ${className}`.trim()
				: child.props.className,
		})
	}

	return (
		<button data-slot="filter-clear" type="button" onClick={clear} className={className}>
			{children}
		</button>
	)
}
