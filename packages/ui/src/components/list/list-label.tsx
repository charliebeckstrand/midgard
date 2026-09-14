import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/list'

/** Props for {@link ListLabel}: native `<span>` attributes via the slot factory. */
export type ListLabelProps = ComponentProps<'span'>

/** Primary text label for a {@link ListItem}, rendered as a styled `<span>`. */
export const ListLabel = createSlot('span', 'list-label', k.label)
