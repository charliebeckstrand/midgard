import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { iro, ji } from '../../recipes'

export type CardDescriptionProps = SlotProps<'p'>

export const CardDescription = createSlot('p', 'card-description', ji.size.sm, iro.text.muted)
