'use client'

import { type ComponentProps, useMemo } from 'react'
import { ariaAttr } from '../../core'
import { ToggleGroup } from '../../primitives/toggle'
import type { AccessibleName } from '../../types'
import { useControl } from '../control/context'
import { useControlProps } from '../control/use-control-props'
import { RadioGroupContext } from './context'

/**
 * Props for {@link RadioGroup}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`), enforced at the type level by `AccessibleName`.
 *
 * @remarks
 * RadioGroup carries no `name` binding, and neither does {@link Radio}. A radio
 * group is one value across N inputs, so the §7.2 per-control binding does not
 * apply. `name` on a {@link Radio} is the native grouping name that makes the
 * inputs one set. Bind the group's value through a {@link Field} instead.
 */
// An enclosing `<fieldset>`'s `<legend>` does not name a `radiogroup` div;
// pass an explicit `aria-label` or `aria-labelledby`.
export type RadioGroupProps = AccessibleName & {
	/**
	 * Keeps the selection of the group. A click, a Space press, or an arrow key
	 * does not check a radio, and `onChange` does not fire. The arrow keys still
	 * move the focus, and the checked radio submits its value. The group sets
	 * `aria-readonly`. When omitted, it takes the value of an enclosing
	 * `<Control>` or `<Field>`.
	 * @defaultValue `false`, or the state of the enclosing Control.
	 */
	readOnly?: boolean
} & Omit<ComponentProps<'div'>, 'aria-label' | 'aria-labelledby'>

/**
 * Group layout container for a set of {@link Radio} controls, rendered as a
 * `role="radiogroup"`. Requires its own accessible name; an enclosing
 * `<fieldset>` legend does not name the group.
 *
 * @remarks Layout, ARIA role, and the read-only state only; it adds no
 * roving-focus or arrow-key handling. Wire radios to a shared `name` for native
 * single-selection and arrow-key navigation. A read-only group sets
 * `aria-readonly`, and each radio in it blocks the check. A radio does not set
 * `aria-readonly`, because ARIA defines it on the group.
 *
 * In a `<Field>` or `<Control>`, the group takes the description of that
 * wrapper as its own `aria-describedby`. A bare {@link Radio} of the group does
 * not adopt the id or the description of the wrapper, because the wrapper is
 * for the group. The radio still takes `disabled`, `required`, `readOnly`, and
 * the validation state of the wrapper. A {@link RadioField} in the group gives
 * its radio its own id.
 * @see {@link Radio}
 */
export function RadioGroup({
	readOnly,
	'aria-describedby': ariaDescribedBy,
	...props
}: RadioGroupProps) {
	const fieldId = useControl()?.id

	const { readOnly: resolvedReadOnly, 'aria-describedby': resolvedDescribedBy } = useControlProps({
		readOnly,
		'aria-describedby': ariaDescribedBy,
	})

	const group = useMemo(
		() => ({ readOnly: !!resolvedReadOnly, fieldId }),
		[resolvedReadOnly, fieldId],
	)

	// Consumer props spread first; the radiogroup role, the description, and the
	// read-only state after them take precedence.
	return (
		<RadioGroupContext value={group}>
			<ToggleGroup
				{...props}
				role="radiogroup"
				aria-describedby={resolvedDescribedBy}
				aria-readonly={ariaAttr(resolvedReadOnly)}
			/>
		</RadioGroupContext>
	)
}
