import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/alert'

export type AlertTitleProps = SlotProps<'div'>

export const AlertTitle = createSlot('div', 'alert-title', k.title)
