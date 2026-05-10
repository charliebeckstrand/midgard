import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { iro } from '../../recipes/ryu/iro'
import { ji } from '../../recipes/ryu/ji'

export type CardDescriptionProps = SlotProps<'p'>

export const CardDescription = createSlot('p', 'card-description', ji.size.sm, iro.text.muted)
