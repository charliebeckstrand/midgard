'use client'

import {
	Children,
	cloneElement,
	type ElementType,
	isValidElement,
	type ReactElement,
	type ReactNode,
} from 'react'
import { cn } from '../../core'
import { Description, Field, Label, Message } from '../fieldset'
import { useFilters } from './context'

/** Fieldset decoration types passed through untouched rather than given the slot name. @internal */
const DECORATION_TYPES = new Set<ElementType>([Label, Description, Message])

/**
 * Slot value and setter passed to a {@link FiltersField} render-prop child.
 *
 * @typeParam V - The type of the slot value. The slot is `undefined` while it
 * is not set, and `onValueChange(undefined)` clears it.
 */
export type FiltersFieldRenderProps<V = unknown> = {
	value: V | undefined
	onValueChange: (value: V | undefined) => void
}

/**
 * Props for {@link FiltersField}.
 *
 * @typeParam V - The type of the slot value that the render function receives.
 */
export type FiltersFieldProps<V = unknown> = {
	/** Key this field owns within the {@link Filters} value record. */
	name: string
	/** A control element, or a render function receiving {@link FiltersFieldRenderProps}. */
	children: ReactNode | ((field: FiltersFieldRenderProps<V>) => ReactNode)
	className?: string
}

/**
 * Binds a single named slot of the enclosing {@link Filters} value to a control.
 * Given a render function, supplies `{ value, onValueChange }`; given elements,
 * gives the slot `name` to the first non-decoration child (passing
 * `Label`/`Description`/`Message` through untouched).
 *
 * @remarks
 * The bar is the form store of its fields, so the element form follows the
 * rule of a `Form`: a control binds the slot that its `name` gives. Each
 * control that binds a `Form` field binds a slot the same way, a wrapper that
 * passes `name` to one of them included. The own `value` or `checked` of a
 * control wins over the slot, as in a `Form`. Must render inside a `Filters`.
 *
 * A `Radio` takes its `name` as the native group name and binds no field, so
 * it binds no slot. Use the render function for a radio, for a control that
 * does not bind by `name`, or for your own control.
 *
 * The field is generic over the slot value. Give the type at the call site,
 * as in `<FiltersField<number> name="minPrice">`, or annotate the parameter of
 * the render function. The render function then reads a typed `value` and needs
 * no cast. The field does not check the slot value at runtime, so the type is
 * a statement of the caller about its own record.
 */
export function FiltersField<V = unknown>({ name, children, className }: FiltersFieldProps<V>) {
	const { value: filterValue, setValue, layout } = useFilters()

	// A stacked field fills its column; a rail's field keeps whatever width it was
	// given and refuses to be squeezed, which is what makes the row overflow and
	// scroll rather than crushing five controls into the space of two.
	const width = layout === 'rail' ? 'shrink-0' : 'w-full'

	if (typeof children === 'function') {
		const renderProps: FiltersFieldRenderProps<V> = {
			// The record holds `unknown`. The caller names the type of its own slot.
			value: filterValue[name] as V | undefined,
			onValueChange: (next) => setValue(name, next),
		}

		return (
			<Field data-slot="filter-field" className={cn(width, className)}>
				{children(renderProps)}
			</Field>
		)
	}

	// The first non-decoration child is the control. An object, not a `let`:
	// the React Compiler rejects a reassignment inside a callback.
	const control = { named: false }

	const processed = Children.map(children, (child) => {
		if (!isValidElement(child) || DECORATION_TYPES.has(child.type as ElementType)) return child

		if (control.named) return child

		control.named = true

		return cloneElement(child as ReactElement<{ name?: string }>, { name })
	})

	return (
		<Field data-slot="filter-field" className={cn(width, className)}>
			{processed}
		</Field>
	)
}
