'use client'

import { cn } from '../../core'
import { useStepper } from './context'
import { stepperTitleVariants } from './variants'

export type StepperTitleProps = React.ComponentPropsWithoutRef<'span'>

export function StepperTitle({ className, ...props }: StepperTitleProps) {
	const { orientation, onValueChange } = useStepper()

	const interactive = onValueChange !== undefined

	return (
		<span
			data-slot="stepper-title"
			className={cn(stepperTitleVariants({ orientation, interactive }), className)}
			{...props}
		/>
	)
}
