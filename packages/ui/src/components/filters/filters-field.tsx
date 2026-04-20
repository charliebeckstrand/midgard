'use client'

import type React from 'react'
import { Children, cloneElement, isValidElement, useCallback } from 'react'
import { cn } from '../../core'
import { Description, ErrorMessage, Field, Label } from '../fieldset'
import { useFilters } from './context'

// ── Helpers ────────────────────────────────────────

function isSyntheticEvent(v: unknown): v is React.SyntheticEvent<HTMLInputElement> {
	return v !== null && typeof v === 'object' && 'target' in v && 'nativeEvent' in v
}

const DECORATION_TYPES = new Set<React.ElementType>([Label, Description, ErrorMessage])

function isDecoration(child: React.ReactElement): boolean {
	return DECORATION_TYPES.has(child.type as React.ElementType)
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

	// Render prop pattern
	if (typeof children === 'function') {
		const renderProps: FiltersFieldRenderProps = { value: fieldValue, onChange: handleChange }

		return (
			<Field data-slot="filter-field" className={cn('w-full', className)}>
				{children(renderProps)}
			</Field>
		)
	}

	// Clone the first non-decoration child as the control; pass through
	// Label/Description/ErrorMessage siblings untouched. null (not undefined)
	// signals "explicit empty" to components that distinguish controlled state.
	let controlCloned = false

	const processed = Children.map(children, (child) => {
		if (!isValidElement(child)) return child

		if (isDecoration(child)) return child

		if (controlCloned) return child

		controlCloned = true

		return cloneElement(child as React.ReactElement<Record<string, unknown>>, {
			value: fieldValue ?? null,
			onChange: handleChange,
		})
	})

	return (
		<Field data-slot="filter-field" className={cn('w-full', className)}>
			{processed}
		</Field>
	)
}
