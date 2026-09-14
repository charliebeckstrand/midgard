import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/stat'

/** Props for {@link StatDescription}: an optional `className` plus `<div>` attributes. */
export type StatDescriptionProps = ComponentProps<'div'>

/**
 * Supporting copy beneath a `Stat`'s value (context, time range, footnote).
 * Static leaf: renders in React Server Components. Compose
 * `<StatDescriptionSkeleton>` in the loading tree.
 */
export const StatDescription = createSlot('div', 'stat-description', k.description)
