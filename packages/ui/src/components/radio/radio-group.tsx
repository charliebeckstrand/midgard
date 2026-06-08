import type { ComponentPropsWithoutRef } from 'react'
import { ToggleGroup } from '../../primitives/toggle'
import type { AccessibleName } from '../../types'

// A radiogroup div isn't named by an enclosing <fieldset>'s <legend> (that
// labels the fieldset, not the nested div), so require an explicit name —
// typically aria-labelledby pointing at the group's Legend/Label.
export type RadioGroupProps = AccessibleName &
	Omit<ComponentPropsWithoutRef<'div'>, 'aria-label' | 'aria-labelledby'>

export function RadioGroup(props: RadioGroupProps) {
	return <ToggleGroup role="radiogroup" {...props} />
}
