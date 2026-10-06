import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/card'

/** Props for {@link CardFooter}; a slotted `<div>` that accepts `render` for composition. */
export type CardFooterProps = ComponentProps<'div'>

/**
 * Footer region of a {@link Card}, a flex row for actions or supporting
 * controls. When the row is wider than the card, the actions wrap onto a new
 * line. Spaces its actions and its lines by the step of the nearest density
 * scope. Pads its top edge by that step when a sibling other than a
 * {@link CardHeader} comes before it. A footer with no sibling before it adds
 * no pad, and the card pads that edge. After a header, the header pads the
 * edge.
 *
 * @remarks
 * Static leaf: renders in React Server Components.
 */
export const CardFooter = createSlot('div', 'card-footer', k.footer)
