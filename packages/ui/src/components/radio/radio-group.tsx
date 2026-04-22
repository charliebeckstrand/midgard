import { ToggleGroup } from '../../primitives'

export type RadioGroupProps = React.ComponentPropsWithoutRef<'div'>

export function RadioGroup(props: RadioGroupProps) {
	return <ToggleGroup role="radiogroup" {...props} />
}
