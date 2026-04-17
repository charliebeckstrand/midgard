'use client'

import type React from 'react'
import { Children, cloneElement, isValidElement, useCallback } from 'react'
import { useFilters } from './context'

// ── Helpers ────────────────────────────────────────

function isSyntheticEvent(v: unknown): v is React.SyntheticEvent<HTMLInputElement> {
	return v !== null && typeof v === 'object' && 'target' in v && 'nativeEvent' in v
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

	// Clone element — null (not undefined) keeps children in controlled mode.
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
