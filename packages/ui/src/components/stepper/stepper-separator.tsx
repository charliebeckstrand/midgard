'use client'

import { cn } from '../../core'
import { useStepper } from './context'
import { stepperSeparatorVariants } from './variants'

export type StepperSeparatorProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function StepperSeparator({ className, ...props }: StepperSeparatorProps) {
	const { orientation } = useStepper()

	return (
		<div
			data-slot="stepper-separator"
			role="presentation"
			aria-hidden="true"
			className={cn(stepperSeparatorVariants({ orientation }), className)}
			{...props}
		/>
	)
}
