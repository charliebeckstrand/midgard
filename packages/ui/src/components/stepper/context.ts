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
}

type StepperStepContextValue = {
	value: number
	state: StepState
}

export const [StepperProvider, useStepper] = createContext<StepperContextValue>('Stepper')

export const [StepperStepProvider, useStepperStep] =
	createContext<StepperStepContextValue>('StepperStep')
