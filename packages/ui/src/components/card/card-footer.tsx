import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/card'

/** Props for {@link CardFooter}; a slotted `<div>` that accepts `render` for composition. */
export type CardFooterProps = SlotProps<'div'>

/**
 * Footer region of a {@link Card}, a flex row for actions or supporting
 * controls. Carries md padding and gap; a non-md `<Card size>` overrides them
 * through the card's section projection.
 *
 * @remarks
 * Static leaf: renders in React Server Components.
 */
export const CardFooter = createSlot(
	'div',
	'card-footer',
	k.footerPadding.md,
	'flex items-center',
	k.footerGap.md,
)
