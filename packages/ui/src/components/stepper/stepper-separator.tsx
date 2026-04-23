'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { useStepper } from './context'
import { stepperSeparatorVariants } from './variants'

export type StepperSeparatorProps = {
	className?: string
} & Omit<ComponentPropsWithoutRef<'div'>, 'className'>

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
