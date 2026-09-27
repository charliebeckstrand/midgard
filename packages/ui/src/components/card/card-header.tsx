import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/card'

/** Props for {@link CardHeader}; a slotted `<div>` that accepts `render` for composition. */
export type CardHeaderProps = ComponentProps<'div'>

/**
 * Header region of a {@link Card}, typically holding a {@link CardTitle} and
 * {@link CardDescription}. Pads its bottom edge by the step of the nearest
 * density scope, whatever sibling follows, so a {@link CardBody} sits one step
 * below.
 *
 * @remarks
 * Static leaf: renders in React Server Components.
 */
export const CardHeader = createSlot('div', 'card-header', k.header)
