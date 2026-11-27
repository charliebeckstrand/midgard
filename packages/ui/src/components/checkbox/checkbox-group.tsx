'use client'

import { type ComponentProps, useMemo } from 'react'
import { ToggleGroup } from '../../primitives/toggle'
import type { AccessibleName } from '../../types/accessible-name'
import { useControl } from '../control/context'
import { useControlProps } from '../control/use-control-props'
import { CheckboxGroupContext } from './context'

/**
 * Props for {@link CheckboxGroup}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`), enforced at the type level by `AccessibleName`.
 */
// An enclosing `<fieldset>`'s `<legend>` does not name a `group` div;
// pass an explicit `aria-label` or `aria-labelledby`.
export type CheckboxGroupProps = AccessibleName &
	Omit<ComponentProps<'div'>, 'aria-label' | 'aria-labelledby'>

/**
 * Group layout container for a set of related {@link CheckboxField} controls,
 * rendered as a `role="group"`. Requires its own accessible name; an enclosing
 * `<fieldset>` legend does not name the group.
 *
 * @remarks Layout and ARIA role only; it adds no roving-focus or arrow-key
 * handling. Each checkbox stays its own Tab stop.
 *
 * In a `<Field>` or `<Control>`, the group takes the id of that wrapper, and
 * the description and the error message of the wrapper as its own
 * `aria-describedby`, as `RadioGroup` does. Thus a refused submit of a form,
 * and a link of a `FormErrorSummary`, move the focus into the group.
 * A bare {@link Checkbox} of the group does not adopt the id or the description
 * of the wrapper, because the wrapper is for the group. The checkboxes still
 * take `disabled`, `readOnly`, and the validation state of the wrapper. They do
 * not take its `required` state: a required wrapper asks for a choice from the
 * group, and a native `required` on each box asks for each box. ARIA gives a
 * `group` no required state, so say it in the label of the group, and check the
 * rule in the validation of the form. A checkbox in the group is required only
 * through its own `required` prop.
 * @see {@link Checkbox}
 */
export function CheckboxGroup({
	id,
	'aria-describedby': ariaDescribedBy,
	...props
}: CheckboxGroupProps) {
	const fieldId = useControl()?.id

	const { id: resolvedId, 'aria-describedby': resolvedDescribedBy } = useControlProps({
		id,
		'aria-describedby': ariaDescribedBy,
	})

	const group = useMemo(() => ({ fieldId }), [fieldId])

	// Consumer props spread first; the id, the group role, and the description
	// after them take precedence.
	return (
		<CheckboxGroupContext value={group}>
			<ToggleGroup {...props} id={resolvedId} role="group" aria-describedby={resolvedDescribedBy} />
		</CheckboxGroupContext>
	)
}
