import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'

/** Props for {@link CardFooter}; a slotted `<div>` that accepts `render` for composition. */
export type CardFooterProps = SlotProps<'div'>

/**
 * Footer region of a {@link Card}, a flex row for actions or supporting
 * controls. Carries no gap of its own; the Card projects its gap from the
 * body and its action-row gap onto this slot from outside, both keyed to its
 * `size`.
 *
 * @remarks
 * Static leaf: renders in React Server Components.
 */
export const CardFooter = createSlot('div', 'card-footer', 'flex items-center')
