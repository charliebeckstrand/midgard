import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/alert'

export type AlertDescriptionProps = SlotProps<'div'>

export const AlertDescription = createSlot('div', 'alert-description', k.description)
