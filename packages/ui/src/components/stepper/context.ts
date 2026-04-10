'use client'

import { createContext } from '../../core'

export type StepperOrientation = 'horizontal' | 'vertical'

export type StepState = 'completed' | 'current' | 'upcoming'

type StepperContextValue = {
	value: number
	settledValue: number
	onValueChange?: (value: number) => void
	onActiveIndicatorSettled: () => void
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
