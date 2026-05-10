import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'

export type CardFooterProps = SlotProps<'div'>

export const CardFooter = createSlot(
	'div',
	'card-footer',
	'px-(--ui-padding) pb-(--ui-padding) pt-0',
	'flex items-center',
	'gap-(--ui-gap)',
)
