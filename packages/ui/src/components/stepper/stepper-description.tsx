import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/stepper'

export type StepperDescriptionProps = SlotProps<'span'>

export const StepperDescription = createSlot('span', 'stepper-description', k.description)
