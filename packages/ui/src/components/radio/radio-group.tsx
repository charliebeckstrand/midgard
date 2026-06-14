import type { ComponentPropsWithoutRef } from 'react'
import { ToggleGroup } from '../../primitives/toggle'
import type { AccessibleName } from '../../types'

/**
 * Props for {@link RadioGroup}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`), enforced at the type level by `AccessibleName`.
 */
// An enclosing `<fieldset>`'s `<legend>` does not name a `radiogroup` div;
// pass an explicit `aria-label` or `aria-labelledby`.
export type RadioGroupProps = AccessibleName &
	Omit<ComponentPropsWithoutRef<'div'>, 'aria-label' | 'aria-labelledby'>

/**
 * Group layout container for a set of {@link Radio} controls, rendered as a
 * `role="radiogroup"`. Requires its own accessible name; an enclosing
 * `<fieldset>` legend does not name the group.
 *
 * @remarks Layout and ARIA role only; it adds no roving-focus or arrow-key
 * handling. Wire radios to a shared `name` for native single-selection and
 * arrow-key navigation.
 * @see {@link Radio}
 */
export function RadioGroup(props: RadioGroupProps) {
	return <ToggleGroup role="radiogroup" {...props} />
}
