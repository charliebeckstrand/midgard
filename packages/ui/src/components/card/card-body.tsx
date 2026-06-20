import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/card'

/** Props for {@link CardBody}; a slotted `<div>` that accepts `render` for composition. */
export type CardBodyProps = SlotProps<'div'>

/**
 * Main content region of a {@link Card}. Carries md padding; a non-md
 * `<Card size>` overrides it through the card's section projection.
 *
 * @remarks
 * Static leaf: renders in React Server Components.
 */
export const CardBody = createSlot('div', 'card-body', k.bodyPadding.md)
