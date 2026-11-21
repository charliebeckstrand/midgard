import type { ComponentProps } from 'react'
import { createSlot } from '../../core/create-slot'
import { k } from '../../recipes/kata/stepper'

/** Props for {@link StepperPanels}: `className` plus `<div>` attributes. */
export type StepperPanelsProps = ComponentProps<'div'>

/**
 * Container grouping the {@link StepperPanel}s of a {@link Stepper}. The
 * presence of this group below the step row drives whether steps wire
 * `aria-controls` to their panels. It also switches the stepper into a stacked
 * row-plus-panels layout. The panels add nothing to the intrinsic width of the
 * stepper, so a host that fits its content keeps one width from step to step.
 */
export const StepperPanels = createSlot('div', 'stepper-panels', k().panels)
