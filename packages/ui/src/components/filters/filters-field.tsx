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
import { type ControlBinding, controlBinding } from '../control/control-binding'
import { Description, Field, Label, Message } from '../fieldset'
import { useFilters } from './context'

/** True when a change argument is a DOM event rather than a value. @internal */
function isSyntheticEvent(v: unknown): v is SyntheticEvent<HTMLInputElement> {
	return v !== null && typeof v === 'object' && 'target' in v && 'nativeEvent' in v
}

/** Fieldset decoration types passed through untouched rather than wired as the control. @internal */
const DECORATION_TYPES = new Set<ElementType>([Label, Description, Message])

/** True when `child` is a fieldset decoration. @internal */
function isDecoration(child: ReactElement): boolean {
	return DECORATION_TYPES.has(child.type as ElementType)
}

/**
 * Maps the slot value to control props. Toggles read `checked`: an option
 * compares its own value, and a toggle reflects the boolean. Others read
 * `value`, passing `null` rather than `undefined` to stay controlled.
 *
 * @internal
 */
function controlValueProps(
	binding: ControlBinding | undefined,
	child: ReactElement,
	fieldValue: unknown,
): Record<string, unknown> {
	if (binding === 'option') {
		return { checked: fieldValue === (child.props as { value?: unknown }).value }
	}

	if (binding === 'toggle') return { checked: !!fieldValue }

	return { value: fieldValue ?? null }
}

/**
 * Runs the own callback of a child, then the binding. The binding always runs,
 * also after a `preventDefault()` in the callback of the child.
 *
 * @internal
 */
function chainCallbacks<A extends unknown[]>(
	theirs: unknown,
	ours: (...args: A) => void,
): (...args: A) => void {
	if (typeof theirs !== 'function') return ours

	return (...args) => {
		theirs(...args)

		ours(...args)
	}
}

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
 * clones the first non-decoration child (passing `Label`/`Description`/`Message`
 * through untouched) and wires its value and change handler.
 *
 * @remarks
 * Adapts the child's contract automatically: event-based controls (Input,
 * SearchInput, Textarea, Checkbox, Switch, Radio) receive `onChange` with a DOM
 * event; others receive value-shaped `onValueChange`. Checkbox/Switch bind
 * `checked` to the boolean slot, a Radio is checked when its `value` matches the
 * slot, and SearchInput's `onClear` clears the slot. A Radio writes its own
 * `value` to the slot, so a numeric option keeps its type. The own `onChange`,
 * `onValueChange`, or `onClear` of the child runs first, then the binding. Must
 * render inside a `Filters`.
 *
 * The element form reads a binding marker that each of those controls carries,
 * so it fits a control this library exports directly. A wrapper around one of
 * those controls is a different component with no marker: the field renders
 * the wrapper and binds nothing. A wrapped `Label` also fails the match, so it
 * takes the control slot and leaves the real control unbound.
 *
 * Use the render function for a wrapper, for your own control, or for one that
 * rejects `null`. The element form binds `value={slot ?? null}` as its explicit
 * empty, which a multi-select or a range control refuses. The two forms are
 * deliberate: the element form keeps the common call site terse, and the render
 * function covers everything a marker cannot reach.
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

	const handleClear = useCallback(() => {
		setValue(name, undefined)
	}, [name, setValue])

	if (typeof children === 'function') {
		const renderProps: FiltersFieldRenderProps<V> = {
			// The record holds `unknown`. The caller names the type of its own slot.
			value: fieldValue as V | undefined,
			onValueChange: handleChange,
		}

		return (
			<Field data-slot="filter-field" className={cn(width, className)}>
				{children(renderProps)}
			</Field>
		)
	}

	// Clones the first non-decoration child as the control; passes
	// Label/Description/Message siblings through untouched. null (not undefined)
	// signals "explicit empty" to components that distinguish controlled state.
	// An object, not a `let`: the React Compiler rejects a reassignment inside a
	// callback.
	const control = { cloned: false }

	const processed = Children.map(children, (child) => {
		if (!isValidElement(child)) return child

		if (isDecoration(child)) return child

		if (control.cloned) return child

		control.cloned = true

		const props = child.props as Record<string, unknown>

		// The control carries its binding as a marker, so the field does not
		// import each control to compare identity.
		const binding = controlBinding(child.type)

		// Toggles read `checked`, not `value`: a Checkbox/Switch reflects the
		// boolean slot; a Radio keeps its own option `value`, checked when it
		// matches the slot.
		const cloned = controlValueProps(binding, child, fieldValue)

		// A Radio writes its own option `value` to the slot, not the string that
		// the DOM holds, so a numeric option still matches the slot.
		const bind =
			binding === 'option' && props.value !== undefined
				? () => setValue(name, props.value)
				: handleChange

		// A marked control gets `onChange` with a DOM event, and another child
		// gets the value-shaped `onValueChange`. The own handlers of the child run
		// first, then the binding. The binding keeps the slot true, so a
		// `preventDefault()` does not skip it (CONVENTIONS.md §3.9).
		const handlerProp = binding === undefined ? 'onValueChange' : 'onChange'

		cloned[handlerProp] = chainCallbacks(props[handlerProp], bind)

		if (binding === 'search') cloned.onClear = chainCallbacks(props.onClear, handleClear)

		return cloneElement(child as ReactElement<Record<string, unknown>>, cloned)
	})

	return (
		<Field data-slot="filter-field" className={cn(width, className)}>
			{processed}
		</Field>
	)
}
