'use client'

import { createContext } from '../../core'
import type { Orientation } from '../../types'

export type StepperOrientation = Orientation

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
