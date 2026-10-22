'use client'

import type { ComponentProps } from 'react'
import { cn } from '../../core'
import { useStepper } from './context'

/** Props for {@link StepperTitle}: native `<span>` attributes. */
export type StepperTitleProps = ComponentProps<'span'>

/** The primary label of a {@link StepperStep}. Picks up orientation- and interactivity-aware styling from stepper context. */
export function StepperTitle({ className, ...props }: StepperTitleProps) {
	const { slots } = useStepper()

	return <span data-slot="stepper-title" className={cn(slots.title, className)} {...props} />
}
