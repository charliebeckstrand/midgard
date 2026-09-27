'use client'

import { createContext } from '../../core'
import type { Mount } from '../../primitives/mount'
import type { Orientation } from '../../types'

/** Layout axis of a {@link Stepper}'s step row: `horizontal` or `vertical`. */
export type StepperOrientation = Orientation

/**
 * How the step row lays out: a fixed {@link StepperOrientation}, or `responsive`,
 * where CSS makes it vertical below `sm` and horizontal from it.
 */
export type StepperLayout = StepperOrientation | 'responsive'

/** A step's position relative to the stepper's current `value`: already passed, active, or not yet reached. */
export type StepState = 'completed' | 'current' | 'upcoming'

type StepperContextValue = {
	value: number
	onValueChange?: (value: number) => void
	layout: StepperLayout
	linear: boolean
	/** Stable id base wiring each step button to its panel. */
	baseId: string
	/** Whether a StepperPanels group is rendered; gates each step's aria-controls. */
	hasPanels: boolean
	/** How panels off the current step are held. */
	mount: Mount
}

type StepperStepContextValue = {
	value: number
	state: StepState
}

export const [StepperContext, useStepper] = createContext<StepperContextValue>('Stepper')

export const [StepperStepContext, useStepperStep] =
	createContext<StepperStepContextValue>('StepperStep')
