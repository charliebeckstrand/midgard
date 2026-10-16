'use client'

import { createContext } from '../../core'
import type { Mount } from '../../primitives/mount'
import { k } from '../../recipes/kata/stepper'
import { type Orientation, type Responsive, resolveVariant } from '../../types'

/** Layout axis of a {@link Stepper}'s step row: `horizontal` or `vertical`. */
export type StepperOrientation = Orientation

/** The default `orientation` of a {@link Stepper}: vertical below `sm`, horizontal from it. */
export const STEPPER_ORIENTATION = {
	initial: 'vertical',
	sm: 'horizontal',
} as const satisfies Responsive<StepperOrientation>

/** The orientation classes of each part of a stepper, at each breakpoint that its `orientation` names. */
export type StepperLayout = Record<
	'base' | 'step' | 'item' | 'title' | 'separator' | 'content',
	string
>

/**
 * Resolves the orientation table of each part of the stepper once. The parts
 * then read their classes from the context, and a step does not resolve them
 * again. The skeleton uses the same classes.
 *
 * @internal
 */
export function stepperLayout(orientation: Responsive<StepperOrientation>): StepperLayout {
	return {
		base: resolveVariant(orientation, k.base.orientation),
		step: resolveVariant(orientation, k.step.orientation),
		item: resolveVariant(orientation, k.item.orientation),
		title: resolveVariant(orientation, k.title.orientation),
		separator: resolveVariant(orientation, k.separator.orientation),
		content: resolveVariant(orientation, k.content.orientation),
	}
}

/** A step's position relative to the stepper's current `value`: already passed, active, or not yet reached. */
export type StepState = 'completed' | 'current' | 'upcoming'

type StepperContextValue = {
	value: number
	onValueChange?: (value: number) => void
	/** The orientation classes of each part, from the `orientation` of the stepper. */
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
