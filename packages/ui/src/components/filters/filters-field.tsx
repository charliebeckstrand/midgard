'use client'

import {
	Children,
	cloneElement,
	type ElementType,
	isValidElement,
	type ReactElement,
	type ReactNode,
	type SyntheticEvent,
	useCallback,
} from 'react'
import { cn } from '../../core'
import { Checkbox } from '../checkbox'
import { Description, Field, Label, Message } from '../fieldset'
import { Input } from '../input'
import { Radio } from '../radio'
import { Switch } from '../switch'
import { Textarea } from '../textarea'
import { useFilters } from './context'

function isSyntheticEvent(v: unknown): v is SyntheticEvent<HTMLInputElement> {
	return v !== null && typeof v === 'object' && 'target' in v && 'nativeEvent' in v
}

const DECORATION_TYPES = new Set<ElementType>([Label, Description, Message])

function isDecoration(child: ReactElement): boolean {
	return DECORATION_TYPES.has(child.type as ElementType)
}

// Children that take a DOM ChangeEvent on `onChange`; everything else gets the
// value-shaped `onValueChange`. The same dispatcher handles both at runtime,
// only the prop name differs.
const EVENT_CALLBACK_TYPES = new Set<ElementType>([Input, Textarea, Checkbox, Switch, Radio])

function expectsEventCallback(child: ReactElement): boolean {
	return EVENT_CALLBACK_TYPES.has(child.type as ElementType)
}

export type FiltersFieldRenderProps = {
	value: unknown
	onValueChange: (value: unknown) => void
}

export type FiltersFieldProps = {
	name: string
	children: ReactNode | ((field: FiltersFieldRenderProps) => ReactNode)
	className?: string
}

export function FiltersField({ name, children, className }: FiltersFieldProps) {
	const { value: filterValue, setValue } = useFilters()

	const fieldValue = filterValue[name]

	const handleChange = useCallback(
		(valueOrEvent: unknown) => {
			if (isSyntheticEvent(valueOrEvent)) {
				const target = valueOrEvent.currentTarget

				setValue(name, target.type === 'checkbox' ? target.checked : target.value)
			} else {
				setValue(name, valueOrEvent)
			}
		},
		[name, setValue],
	)

	// Render prop pattern
	if (typeof children === 'function') {
		const renderProps: FiltersFieldRenderProps = {
			value: fieldValue,
			onValueChange: handleChange,
		}

		return (
			<Field data-slot="filter-field" className={cn('w-full', className)}>
				{children(renderProps)}
			</Field>
		)
	}

	// Clone the first non-decoration child as the control; pass through
	// Label/Description/Message siblings untouched. null (not undefined)
	// signals "explicit empty" to components that distinguish controlled state.
	let controlCloned = false

	const processed = Children.map(children, (child) => {
		if (!isValidElement(child)) return child

		if (isDecoration(child)) return child

		if (controlCloned) return child

		controlCloned = true

		const handlerProp = expectsEventCallback(child) ? 'onChange' : 'onValueChange'

		return cloneElement(child as ReactElement<Record<string, unknown>>, {
			value: fieldValue ?? null,
			[handlerProp]: handleChange,
		})
	})

	return (
		<Field data-slot="filter-field" className={cn('w-full', className)}>
			{processed}
		</Field>
	)
}
