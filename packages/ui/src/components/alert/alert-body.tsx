import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/alert'

export type AlertBodyProps = SlotProps<'div'>

export const AlertBody = createSlot('div', 'alert-body', k.body)
