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
import { SearchInput } from '../search-input'
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

// Children that receive a DOM ChangeEvent on `onChange`; everything else
// receives the value-shaped `onValueChange`. The same dispatcher handles both
// at runtime; only the prop name differs.
const EVENT_CALLBACK_TYPES = new Set<ElementType>([
	Input,
	SearchInput,
	Textarea,
	Checkbox,
	Switch,
	Radio,
])

function expectsEventCallback(child: ReactElement): boolean {
	return EVENT_CALLBACK_TYPES.has(child.type as ElementType)
}

// Children that expose an `onClear` callback (e.g. SearchInput's X button);
// wired to clear the filter slot.
const CLEAR_CALLBACK_TYPES = new Set<ElementType>([SearchInput])

function expectsClearCallback(child: ReactElement): boolean {
	return CLEAR_CALLBACK_TYPES.has(child.type as ElementType)
}

// The slot value as control props: toggles read `checked` (Radio compares its
// own option value; Checkbox/Switch reflect the boolean), others read `value`
// (null, not undefined, to stay controlled).
function controlValueProps(child: ReactElement, fieldValue: unknown): Record<string, unknown> {
	if (child.type === Radio) {
		return { checked: fieldValue === (child.props as { value?: unknown }).value }
	}

	if (child.type === Checkbox || child.type === Switch) return { checked: !!fieldValue }

	return { value: fieldValue ?? null }
}

/** Slot value and setter passed to a {@link FiltersField} render-prop child. */
export type FiltersFieldRenderProps = {
	value: unknown
	onValueChange: (value: unknown) => void
}

/** Props for {@link FiltersField}. */
export type FiltersFieldProps = {
	/** Key this field owns within the {@link Filters} value record. */
	name: string
	/** A control element, or a render function receiving {@link FiltersFieldRenderProps}. */
	children: ReactNode | ((field: FiltersFieldRenderProps) => ReactNode)
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
 * slot, and SearchInput's `onClear` clears the slot. Must render inside a `Filters`.
 */
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

	const handleClear = useCallback(() => {
		setValue(name, undefined)
	}, [name, setValue])

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

	// Clones the first non-decoration child as the control; passes
	// Label/Description/Message siblings through untouched. null (not undefined)
	// signals "explicit empty" to components that distinguish controlled state.
	let controlCloned = false

	const processed = Children.map(children, (child) => {
		if (!isValidElement(child)) return child

		if (isDecoration(child)) return child

		if (controlCloned) return child

		controlCloned = true

		const handlerProp = expectsEventCallback(child) ? 'onChange' : 'onValueChange'

		// Toggles read `checked`, not `value`: a Checkbox/Switch reflects the
		// boolean slot; a Radio keeps its own option `value`, checked when it
		// matches the slot.
		const cloned = controlValueProps(child, fieldValue)

		cloned[handlerProp] = handleChange

		if (expectsClearCallback(child)) cloned.onClear = handleClear

		return cloneElement(child as ReactElement<Record<string, unknown>>, cloned)
	})

	return (
		<Field data-slot="filter-field" className={cn('w-full', className)}>
			{processed}
		</Field>
	)
}
