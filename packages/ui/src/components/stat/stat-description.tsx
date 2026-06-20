import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/stat'

/** Props for {@link StatDescription}: an optional `className` plus `<div>` attributes. */
export type StatDescriptionProps = SlotProps<'div'>

/**
 * Supporting copy beneath a `Stat`'s value (context, time range, footnote).
 * Static leaf: renders in React Server Components. Compose
 * `<StatDescriptionSkeleton>` in the loading tree.
 */
export const StatDescription = createSlot('div', 'stat-description', k.description)
