import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/card'

/** Props for {@link CardDescription}; a slotted `<p>` that accepts `render` for composition. */
export type CardDescriptionProps = SlotProps<'p'>

/**
 * Muted supporting copy for a card, typically paired with `<CardTitle>` in a
 * header. Static leaf: renders in React Server Components.
 */
export const CardDescription = createSlot('p', 'card-description', ...k.description)
