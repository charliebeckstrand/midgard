import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'

export type CardBodyProps = SlotProps<'div'>

export const CardBody = createSlot('div', 'card-body', 'p-(--ui-padding)')
