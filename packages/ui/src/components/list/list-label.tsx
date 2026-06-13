import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/list'

/** Props for {@link ListLabel}: native `<span>` attributes via the slot factory. */
export type ListLabelProps = SlotProps<'span'>

/** Primary text label for a {@link ListItem}, rendered as a styled `<span>`. */
export const ListLabel = createSlot('span', 'list-label', k.label)
