import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'

/** Props for {@link CardBody}; a slotted `<div>` that accepts `render` for composition. */
export type CardBodyProps = SlotProps<'div'>

/**
 * Main content region of a {@link Card}. Carries no padding of its own; the
 * Card frame pads every edge, and projects the inter-section gaps onto a
 * neighbouring header / footer.
 *
 * @remarks
 * Static leaf: renders in React Server Components.
 */
export const CardBody = createSlot('div', 'card-body')
