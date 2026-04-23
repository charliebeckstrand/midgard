import type { ComponentPropsWithoutRef } from 'react'
import { ToggleGroup } from '../../primitives'

export type RadioGroupProps = ComponentPropsWithoutRef<'div'>

export function RadioGroup(props: RadioGroupProps) {
	return <ToggleGroup role="radiogroup" {...props} />
}
