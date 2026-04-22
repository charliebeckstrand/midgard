import { ToggleGroup } from '../../primitives'

export type CheckboxGroupProps = React.ComponentPropsWithoutRef<'div'>

export function CheckboxGroup(props: CheckboxGroupProps) {
	return <ToggleGroup {...props} />
}
