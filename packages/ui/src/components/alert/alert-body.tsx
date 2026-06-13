import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/alert'

/** Props for {@link AlertBody}: standard `<div>` slot props. */
export type AlertBodyProps = SlotProps<'div'>

/** Default content slot for {@link Alert}; wraps bare children when no other slot is present. */
export const AlertBody = createSlot('div', 'alert-body', k.body)
