/**
 * Tsunagi (繋ぎ): group joins.
 *
 * Container-scoped classes that flatten the join-side radii and overlap
 * adjacent borders for the children of a `<Group>`. The DOM order of the
 * children gives each one its position: a child that is not the first joins
 * its start side, and a child that is not the last joins its end side. A child
 * that renders nothing takes no position, and a Fragment adds no level.
 * `<Group>` carries the bundle of its orientation on its container.
 *
 * Each radius class reaches two elements: the child itself, and each
 * `ControlFrame` in it. A control such as Input or Listbox wraps its bordered
 * frame, so a child combinator alone does not reach the border. The border
 * overlap (`-ms-px` / `-mt-px`) moves the child, which is the flex item.
 *
 * A group in a group joins as one child of the outer group. The outer classes
 * also flatten the frames of the inner group on the shared side, so the inner
 * run meets the next outer child with flat corners.
 *
 * `::before` / `::after` mirror the outer radius drop; kasane consumers
 * show no rounded inset-fill or focus-overlay corners on a flat side.
 * Borders overlap by 1 px (`-ms-px` / `-mt-px`); adjacent rings don't
 * double.
 *
 * Horizontal uses logical end / start radii (`rounded-e-none` /
 * `rounded-s-none`); RTL mirrors automatically. Vertical uses physical
 * top / bottom; those don't flip in RTL.
 *
 * Layer: kiso · Concern: group joins
 */

import type { Orientation } from '../../types'

/** Axis a joined group runs along. */
export type GroupOrientation = Orientation

// Literal class strings: Tailwind's source scanner can't see selectors built
// from templates; each variant is spelled out in full.
const horizontal = [
	'[&>:not(:last-child)]:rounded-e-none',
	'[&>:not(:last-child)]:before:rounded-e-none',
	'[&>:not(:last-child)]:after:rounded-e-none',
	'[&>:not(:last-child)_[data-slot=control-frame]]:rounded-e-none',
	'[&>:not(:last-child)_[data-slot=control-frame]]:before:rounded-e-none',
	'[&>:not(:last-child)_[data-slot=control-frame]]:after:rounded-e-none',
	'[&>:not(:first-child)]:rounded-s-none',
	'[&>:not(:first-child)]:before:rounded-s-none',
	'[&>:not(:first-child)]:after:rounded-s-none',
	'[&>:not(:first-child)_[data-slot=control-frame]]:rounded-s-none',
	'[&>:not(:first-child)_[data-slot=control-frame]]:before:rounded-s-none',
	'[&>:not(:first-child)_[data-slot=control-frame]]:after:rounded-s-none',
	'[&>:not(:first-child)]:-ms-px',
] as const

const vertical = [
	'[&>:not(:last-child)]:rounded-b-none',
	'[&>:not(:last-child)]:before:rounded-b-none',
	'[&>:not(:last-child)]:after:rounded-b-none',
	'[&>:not(:last-child)_[data-slot=control-frame]]:rounded-b-none',
	'[&>:not(:last-child)_[data-slot=control-frame]]:before:rounded-b-none',
	'[&>:not(:last-child)_[data-slot=control-frame]]:after:rounded-b-none',
	'[&>:not(:first-child)]:rounded-t-none',
	'[&>:not(:first-child)]:before:rounded-t-none',
	'[&>:not(:first-child)]:after:rounded-t-none',
	'[&>:not(:first-child)_[data-slot=control-frame]]:rounded-t-none',
	'[&>:not(:first-child)_[data-slot=control-frame]]:before:rounded-t-none',
	'[&>:not(:first-child)_[data-slot=control-frame]]:after:rounded-t-none',
	'[&>:not(:first-child)]:-mt-px',
	// A vertical group stretches each child to its width, so the outer edges
	// line up. `w-auto` overrides the `w-fit` of a child such as Button.
	'[&>*]:w-auto',
] as const

/** Join classes for a group container, keyed by orientation. Spread onto the `<Group>` root. */
export const tsunagi = { horizontal, vertical } as const
