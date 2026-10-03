import type { ComponentProps } from 'react'
import { ToggleGroup } from '../../primitives/toggle'
import type { AccessibleName } from '../../types'

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
 * @see {@link Checkbox}
 */
export function CheckboxGroup(props: CheckboxGroupProps) {
	// Consumer props spread first; the group role after them takes precedence.
	return <ToggleGroup {...props} role="group" />
}
