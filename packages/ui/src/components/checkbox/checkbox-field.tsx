import { cn } from '../../core'
import { ToggleField } from '../../primitives'
import { k } from './variants'

export type CheckboxFieldProps = React.ComponentPropsWithoutRef<'div'>

export function CheckboxField({ className, ...props }: CheckboxFieldProps) {
	return <ToggleField className={cn(k.disabled, className)} {...props} />
}
