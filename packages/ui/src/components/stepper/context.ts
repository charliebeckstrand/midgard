'use client'

import { createContext } from '../../core'

export type StepperOrientation = 'horizontal' | 'vertical'

export type StepState = 'completed' | 'current' | 'upcoming'

type StepperContextValue = {
	value: number
	onValueChange?: (value: number) => void
	orientation: StepperOrientation
}

type StepperStepContextValue = {
	value: number
	state: StepState
}

export const [StepperProvider, useStepper] = createContext<StepperContextValue>('Stepper')

export const [StepperStepProvider, useStepperStep] =
	createContext<StepperStepContextValue>('StepperStep')
