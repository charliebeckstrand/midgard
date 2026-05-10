import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/list'

export type ListLabelProps = SlotProps<'span'>

export const ListLabel = createSlot('span', 'list-label', k.label)
