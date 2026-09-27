import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/card'

/** Props for {@link CardFooter}; a slotted `<div>` that accepts `render` for composition. */
export type CardFooterProps = ComponentProps<'div'>

/**
 * Footer region of a {@link Card}, a flex row for actions or supporting
 * controls. Pads its top edge and spaces its actions by the step of the
 * nearest density scope.
 *
 * @remarks
 * Static leaf: renders in React Server Components.
 */
export const CardFooter = createSlot('div', 'card-footer', k.footer)
