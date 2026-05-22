import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/card'

export type CardDescriptionProps = SlotProps<'p'>

export const CardDescription = createSlot('p', 'card-description', ...k.description)
