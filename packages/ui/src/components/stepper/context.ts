'use client'

import { createContext } from '../../core'
import type { Orientation } from '../../types'

/** Layout axis of a {@link Stepper}'s step row: `horizontal` or `vertical`. */
export type StepperOrientation = Orientation

/** A step's position relative to the stepper's current `value`: already passed, active, or not yet reached. */
export type StepState = 'completed' | 'current' | 'upcoming'

type StepperContextValue = {
	value: number
	onValueChange?: (value: number) => void
	orientation: StepperOrientation
	linear: boolean
	/** Stable id base wiring each step button to its panel. */
	baseId: string
	/** Whether a StepperPanels group is rendered; gates each step's aria-controls. */
	hasPanels: boolean
}

type StepperStepContextValue = {
	value: number
	state: StepState
}

export const [StepperContext, useStepper] = createContext<StepperContextValue>('Stepper')

export const [StepperStepContext, useStepperStep] =
	createContext<StepperStepContextValue>('StepperStep')
