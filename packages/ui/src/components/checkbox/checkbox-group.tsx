import type { ComponentPropsWithoutRef } from 'react'
import { ToggleGroup } from '../../primitives/toggle'

/** Props for {@link CheckboxGroup}. */
export type CheckboxGroupProps = ComponentPropsWithoutRef<'div'>

/**
 * Stacks related CheckboxFields under a shared group layout, exposing them as a
 * `role="group"` to assistive tech. Pair with an `aria-labelledby` group label.
 *
 * @remarks The `role` is load-bearing. This component writes it after the
 * spread, so a consumer `role` cannot replace the group semantics
 * ([CONVENTIONS.md](CONVENTIONS.md) §3.9).
 */
export function CheckboxGroup(props: CheckboxGroupProps) {
	// Consumer props spread first; the group role below takes precedence.
	return <ToggleGroup {...props} role="group" />
}
