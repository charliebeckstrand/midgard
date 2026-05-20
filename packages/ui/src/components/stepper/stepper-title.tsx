'use client'

import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/stepper'
import { useStepper } from './context'

export type StepperTitleProps = ComponentPropsWithoutRef<'span'>

export function StepperTitle({ className, ...props }: StepperTitleProps) {
	const { orientation, onValueChange } = useStepper()

	const interactive = onValueChange !== undefined

	return (
		<span
			data-slot="stepper-title"
			className={cn(k.title({ orientation, interactive }), className)}
			{...props}
		/>
	)
}
