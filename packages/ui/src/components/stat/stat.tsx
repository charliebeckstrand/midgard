import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/stat'

/** Props for {@link Stat}: an optional `className` plus `<div>` attributes. */
export type StatProps = ComponentProps<'div'>

/**
 * Composition root for a data-display metric: a full-height flex column that
 * stacks `<StatLabel>`, `<StatValue>`, `<StatDelta>`, and `<StatDescription>`
 * children with consistent spacing. Holds no value of its own; arrange the
 * sub-parts to taste. A static leaf with no client hooks, so it renders in
 * React Server Components; mirror its tree with the matching `*Skeleton` parts
 * while loading.
 */
export const Stat = createSlot('div', 'stat', k())
