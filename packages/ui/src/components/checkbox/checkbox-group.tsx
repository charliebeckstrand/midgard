import type { ComponentPropsWithoutRef } from 'react'
import { ToggleGroup } from '../../primitives/toggle'

/** Props for {@link CheckboxGroup}. */
export type CheckboxGroupProps = ComponentPropsWithoutRef<'div'>

/**
 * Stacks related CheckboxFields under a shared group layout, exposing them as a
 * `role="group"` to assistive tech. Pair with an `aria-labelledby` group label.
 */
export function CheckboxGroup(props: CheckboxGroupProps) {
	return <ToggleGroup role="group" {...props} />
}
