import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/stat'

/** Props for {@link StatLabel}: an optional `className` plus `<div>` attributes. */
export type StatLabelProps = SlotProps<'div'>

/**
 * Caption naming the metric a `Stat` reports, sitting above its value. Static
 * leaf: renders in React Server Components. Renders at the `md` step; compose
 * `<StatLabelSkeleton>` in the loading tree.
 */
export const StatLabel = createSlot('div', 'stat-label', k.label({ size: 'md' }))
