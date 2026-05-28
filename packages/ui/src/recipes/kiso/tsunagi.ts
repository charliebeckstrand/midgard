/**
 * Tsunagi (繋ぎ) — group joins.
 *
 * Type contract for the group-join system. The runtime rules live in
 * `styles/recipes/tsunagi.css` — authored CSS keyed on `data-group` /
 * `data-group-orientation` attributes stamped by `useGroup()`. Costs
 * nothing on elements that aren't inside a `<Group>`.
 *
 * Layer: kiso · Concern: group joins
 */

import type { Orientation } from '../../types'

export type GroupPosition = 'start' | 'middle' | 'end' | 'only'

export type GroupOrientation = Orientation
