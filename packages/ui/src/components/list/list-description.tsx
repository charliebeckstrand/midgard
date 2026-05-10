import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/list'

export type ListDescriptionProps = SlotProps<'span'>

export const ListDescription = createSlot('span', 'list-description', k.description)
