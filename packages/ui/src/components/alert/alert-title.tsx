import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/alert'

/** Props for {@link AlertTitle}: standard `<div>` slot props. */
export type AlertTitleProps = SlotProps<'div'>

/** Heading slot for {@link Alert}, rendered above the description. */
export const AlertTitle = createSlot('div', 'alert-title', k.title)
