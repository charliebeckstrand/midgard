import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/card'

/** Props for {@link CardHeader}; a slotted `<div>` that accepts `render` for composition. */
export type CardHeaderProps = SlotProps<'div'>

/**
 * Header region of a {@link Card}, typically holding a {@link CardTitle} and
 * {@link CardDescription}. Carries no gap of its own; the Card projects its
 * gap to the body onto this slot from outside, keyed to its `size`. A
 * {@link CardBody} as its next sibling collapses that gap to zero, so the two
 * sit flush; any other next sibling (or none) keeps the projected gap.
 *
 * @remarks
 * Static leaf: renders in React Server Components.
 */
export const CardHeader = createSlot('div', 'card-header', k.header)
