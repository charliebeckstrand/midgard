import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { iro } from '../../recipes/ryu/iro'

export type CardHeaderProps = SlotProps<'div'>

export const CardHeader = createSlot(
	'div',
	'card-header',
	'px-(--ui-padding) pt-(--ui-padding) pb-0',
	iro.text.default,
)
