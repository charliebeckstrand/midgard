'use client'

import { createContext } from '../../core'
import type { Mount } from '../../primitives/mount'
import type { k } from '../../recipes/kata/stepper'
import type { Orientation } from '../../types'

/** Layout axis of a {@link Stepper}'s step row: `horizontal` or `vertical`. */
export type StepperOrientation = Orientation

/** The slots of a stepper, resolved for its `orientation` and whether its steps are buttons. */
export type StepperSlots = ReturnType<typeof k>

/** A step's position relative to the stepper's current `value`: already passed, active, or not yet reached. */
export type StepState = 'completed' | 'current' | 'upcoming'

type StepperContextValue = {
	value: number
	onValueChange?: (value: number) => void
	/** The slots of each part, from the `orientation` of the stepper and whether its steps are buttons. */
	slots: StepperSlots
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
