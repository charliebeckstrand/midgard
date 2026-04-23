import type { ComponentPropsWithoutRef } from 'react'
import { ToggleGroup } from '../../primitives'

export type CheckboxGroupProps = ComponentPropsWithoutRef<'div'>

export function CheckboxGroup(props: CheckboxGroupProps) {
	return <ToggleGroup {...props} />
}
