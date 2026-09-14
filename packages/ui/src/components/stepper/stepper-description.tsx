import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/stepper'

/** Props for {@link StepperDescription}: native `<span>` attributes. */
export type StepperDescriptionProps = ComponentProps<'span'>

/** Secondary supporting text beneath a {@link StepperTitle}. A styled `<span>` slot carrying `data-slot="stepper-description"`. */
export const StepperDescription = createSlot('span', 'stepper-description', k.description)
