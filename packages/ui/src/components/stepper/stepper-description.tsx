import { cn } from '../../core'
import { k } from './variants'

export type StepperDescriptionProps = React.ComponentPropsWithoutRef<'span'>

export function StepperDescription({ className, ...props }: StepperDescriptionProps) {
	return (
		<span data-slot="stepper-description" className={cn(k.description, className)} {...props} />
	)
}
