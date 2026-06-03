/**
 * Tsunagi (繋ぎ) — group joins.
 *
 * Container-scoped classes that flatten the join-side radii and overlap
 * adjacent borders for the children of a `<Group>`. `useGroup()` stamps
 * `data-group` (`start` | `middle` | `end` | `only`) and
 * `data-group-orientation` (`horizontal` | `vertical`) onto each child;
 * `<Group>` carries the matching orientation bundle on its container, and
 * the descendant selectors it compiles to apply only once a child reports a
 * position.
 *
 * Authored as container classes rather than `data-[group=…]:` utilities on
 * every control so the joins cost nothing when an element isn't grouped — a
 * control would otherwise carry ~20 dormant utilities in its class string.
 * The cost lands on the single group container instead, and the lone
 * stylesheet this used to need is gone.
 *
 * Keyed on both orientation and position so the reach stays depth-tolerant
 * yet nest-safe. Depth-tolerant: the bordered element is `ControlFrame`,
 * nested below a control wrapper in Select / DatePicker, so a direct-child
 * combinator wouldn't reach it. Nest-safe: the orientation match keeps an
 * inner vertical group clear of an outer horizontal one, and same-orientation
 * nesting reapplies the identical position-keyed declarations, so it stays
 * idempotent rather than fighting on the cascade.
 *
 * `::before` / `::after` mirror the outer radius drop so kasane consumers
 * don't show rounded inset-fill or focus-overlay corners while the outer
 * element is flat. Borders overlap by 1 px (`-ms-px` / `-mt-px`) so adjacent
 * rings don't double.
 *
 * Horizontal uses logical end / start radii (`rounded-e-none` /
 * `rounded-s-none`) so RTL mirrors automatically. Vertical uses physical
 * top / bottom — those don't flip in RTL.
 *
 * Layer: kiso · Concern: group joins
 */

import type { Orientation } from '../../types'

export type GroupPosition = 'start' | 'middle' | 'end' | 'only'

export type GroupOrientation = Orientation

// Literal class strings — Tailwind's source scanner can't see selectors built
// from templates, so each variant is spelled out in full.
const horizontal = [
	'[&_[data-group-orientation=horizontal][data-group=start]]:rounded-e-none',
	'[&_[data-group-orientation=horizontal][data-group=start]]:before:rounded-e-none',
	'[&_[data-group-orientation=horizontal][data-group=start]]:after:rounded-e-none',
	'[&_[data-group-orientation=horizontal][data-group=middle]]:rounded-none',
	'[&_[data-group-orientation=horizontal][data-group=middle]]:before:rounded-none',
	'[&_[data-group-orientation=horizontal][data-group=middle]]:after:rounded-none',
	'[&_[data-group-orientation=horizontal][data-group=end]]:rounded-s-none',
	'[&_[data-group-orientation=horizontal][data-group=end]]:before:rounded-s-none',
	'[&_[data-group-orientation=horizontal][data-group=end]]:after:rounded-s-none',
	'[&_[data-group-orientation=horizontal][data-group=middle]]:-ms-px',
	'[&_[data-group-orientation=horizontal][data-group=end]]:-ms-px',
] as const

const vertical = [
	'[&_[data-group-orientation=vertical][data-group=start]]:rounded-b-none',
	'[&_[data-group-orientation=vertical][data-group=start]]:before:rounded-b-none',
	'[&_[data-group-orientation=vertical][data-group=start]]:after:rounded-b-none',
	'[&_[data-group-orientation=vertical][data-group=middle]]:rounded-none',
	'[&_[data-group-orientation=vertical][data-group=middle]]:before:rounded-none',
	'[&_[data-group-orientation=vertical][data-group=middle]]:after:rounded-none',
	'[&_[data-group-orientation=vertical][data-group=end]]:rounded-t-none',
	'[&_[data-group-orientation=vertical][data-group=end]]:before:rounded-t-none',
	'[&_[data-group-orientation=vertical][data-group=end]]:after:rounded-t-none',
	'[&_[data-group-orientation=vertical][data-group=middle]]:-mt-px',
	'[&_[data-group-orientation=vertical][data-group=end]]:-mt-px',
] as const

/**
 * Join classes for a group container, keyed by orientation. Spread onto the
 * `<Group>` root; inert until `useGroup` stamps positions on the children.
 */
export const tsunagi = { horizontal, vertical } as const
