import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/stat'

/** Props for {@link StatLabel}: an optional `className` plus `<div>` attributes. */
export type StatLabelProps = ComponentProps<'div'>

/**
 * Caption naming the metric a `Stat` reports, sitting above its value. Static
 * leaf: renders in React Server Components. Its text takes the step of the
 * nearest density scope: `text-xs` at `sm`, `text-sm` at `md`, and `text-base`
 * at `lg`. Compose `<StatLabelSkeleton>` in the loading tree.
 */
export const StatLabel = createSlot('div', 'stat-label', k.label)
