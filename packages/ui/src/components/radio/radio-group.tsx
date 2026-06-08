import type { ComponentPropsWithoutRef } from 'react'
import { ToggleGroup } from '../../primitives/toggle'
import type { AccessibleName } from '../../types'

// A `radiogroup` div is not named by an enclosing `<fieldset>`'s `<legend>`;
// an explicit `aria-label` or `aria-labelledby` is required.
export type RadioGroupProps = AccessibleName &
	Omit<ComponentPropsWithoutRef<'div'>, 'aria-label' | 'aria-labelledby'>

export function RadioGroup(props: RadioGroupProps) {
	return <ToggleGroup role="radiogroup" {...props} />
}
