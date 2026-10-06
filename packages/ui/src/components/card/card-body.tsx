import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/card'

/** Props for {@link CardBody}; a slotted `<div>` that accepts `render` for composition. */
export type CardBodyProps = ComponentProps<'div'>

/**
 * Main content region of a {@link Card}. Carries no padding of its own. The
 * Card frame pads every edge. The header and footer pad the edges that they
 * share with the body. Breaks a token that is wider than its line, such as an
 * ID or a URL. The card clips content that runs past its edge.
 *
 * @remarks
 * Static leaf: renders in React Server Components.
 */
export const CardBody = createSlot('div', 'card-body', k.body)
