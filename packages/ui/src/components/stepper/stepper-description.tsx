import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/stepper'

export type StepperDescriptionProps = ComponentPropsWithoutRef<'span'>

export function StepperDescription({ className, ...props }: StepperDescriptionProps) {
	return (
		<span data-slot="stepper-description" className={cn(k.description, className)} {...props} />
	)
}
