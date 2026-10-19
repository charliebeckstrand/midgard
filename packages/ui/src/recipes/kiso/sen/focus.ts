/**
 * Sen focus: how an element signals keyboard focus. Six named shapes
 * cover the patterns the library uses:
 *
 *   - `ring`      outset CSS outline + transparent offset gap. Renders as one
 *                 crisp stroke along the radius (unlike two stacked ring
 *                 shadows, which leave an anti-aliased seam at the corners).
 *                 The offset gap exposes the surface behind. The stroke reads
 *                 against the element's own fill even when the fill IS the
 *                 accent color. That covers a solid button, a selected day,
 *                 an arbitrary-color swatch.
 *   - `virtual`   the `ring` stroke without its `:focus-visible` gate, for
 *                 virtual-highlight models (the date picker grid) where the
 *                 marked element never holds DOM focus
 *   - `inset`     inset ring, for controls whose fill is already the surface
 *                 (inputs, in-chrome controls) or whose box can't carry an
 *                 outset stroke (bordered, inline). Forced colors remove
 *                 the ring, which is a box-shadow, so under forced colors
 *                 an inset outline shows the focus
 *   - `outline`   2 px outline on a `:has(:focus-visible)` wrapper,
 *                 swapped to an inset border inside scrollable ancestors,
 *                 which clip an outset outline
 *   - `indicator` background-paint marker on `::after`, in the focus-ring
 *                 color, for a focused tab. On the current tab, it paints
 *                 over the selection bar, so the current tab also shows
 *                 focus.
 *   - `lifted`    z-shift + shadow for a picked-up element, plus the violet
 *                 accent that reads against the panel backdrop. Split into
 *                 `raise` and one entry per indicator shape, because the host
 *                 that lifts is not always the host that takes focus. A
 *                 reorderable List row raises the `<li>` but seats the Tab
 *                 stop on its content area when that content is activatable.
 *                 Tailwind extracts whole class names, so the accent cannot be
 *                 interpolated into a shape. Stating both here is what keeps
 *                 one edit enough to change it everywhere.
 *
 * Layer: kiso · Concern: focus indicators
 */

import { forced } from './forced'

export const focus = {
	ring: [
		// CSS outline, not a box-shadow ring: one crisp stroke along the radius.
		// `outline-offset` opens a transparent gap exposing the surface behind;
		// the stroke reads against the element's fill even when the fill IS the
		// accent color. The accent is `blue-600` in both modes. Mouse-focus
		// outlines are suppressed globally (:focus:not(:focus-visible)).
		'focus-visible:outline-2 focus-visible:outline-offset-2',
		'focus-visible:outline-blue-600',
	],
	// `outline-solid` evicts `inset`'s ungated `outline-none` in
	// tailwind-merge (same outline-style group) when both land on one
	// element, e.g. a plain Button day cell; without it the stroke never
	// renders.
	virtual: ['outline-solid outline-2 outline-offset-2', 'outline-blue-600'],
	inset: [
		'outline-none',
		'focus-visible:ring-2 ring-inset focus-visible:ring-blue-600',
		// The variants keep the fallback out of the tailwind-merge group of `outline-none`.
		...forced.ring.inset,
	],
	outline: [
		'has-focus-visible:outline-2 has-focus-visible:outline-blue-600 has-focus-visible:outline-offset-2',
		/** Swaps to a 2 px border inside `[data-scroll-region]` ancestors, where `overflow-y-auto` clips an outset outline. */
		'[[data-scroll-region]_&]:has-focus-visible:outline-none [[data-scroll-region]_&]:has-focus-visible:border-2 [[data-scroll-region]_&]:has-focus-visible:border-blue-600',
	],
	indicator: 'focus-visible:after:bg-blue-600',
	/**
	 * The inset ring of a box whose control has keyboard focus. The control
	 * removes its own outline, and the box draws the ring around the control and
	 * its neighbors. A control that sits deeper, such as an action in an affix
	 * slot or a header in a nested panel, keeps its own ring. Each entry carries
	 * the forced-colors outline of `ring.inset`.
	 */
	within: {
		/** A row whose child control has the focus: the affixed row of Nav, Sidebar, and ChatList. */
		row: [
			'ring-inset has-[>:focus-visible]:ring-2 has-[>:focus-visible]:ring-blue-600',
			'forced-colors:has-[>:focus-visible]:outline-solid forced-colors:has-[>:focus-visible]:outline-2',
			'forced-colors:has-[>:focus-visible]:-outline-offset-2 forced-colors:has-[>:focus-visible]:outline-[Highlight]',
		],
		/**
		 * The same ring on a surface inside the `group` row, such as the active
		 * indicator. The row paints its ring beneath a positioned descendant, so
		 * the opaque surface draws the ring again.
		 */
		indicator: [
			'ring-inset group-has-[>:focus-visible]:ring-2 group-has-[>:focus-visible]:ring-blue-600',
			'forced-colors:group-has-[>:focus-visible]:outline-solid forced-colors:group-has-[>:focus-visible]:outline-2',
			'forced-colors:group-has-[>:focus-visible]:-outline-offset-2 forced-colors:group-has-[>:focus-visible]:outline-[Highlight]',
		],
		/** A section whose heading holds the control that has the focus: the item of Accordion. */
		heading: [
			'ring-inset has-[>:is(h1,h2,h3,h4,h5,h6)>:focus-visible]:ring-2 has-[>:is(h1,h2,h3,h4,h5,h6)>:focus-visible]:ring-blue-600',
			'forced-colors:has-[>:is(h1,h2,h3,h4,h5,h6)>:focus-visible]:outline-solid forced-colors:has-[>:is(h1,h2,h3,h4,h5,h6)>:focus-visible]:outline-2',
			'forced-colors:has-[>:is(h1,h2,h3,h4,h5,h6)>:focus-visible]:-outline-offset-2 forced-colors:has-[>:is(h1,h2,h3,h4,h5,h6)>:focus-visible]:outline-[Highlight]',
		],
	},
	lifted: {
		/** The raise itself, for whichever box is picked up. */
		raise: ['z-10', 'shadow-md'],
		/** Violet accent for a lifted host whose indicator is an inset ring. */
		ring: 'focus-visible:ring-violet-600',
		/** Violet accent for a lifted host whose indicator is an outset outline. */
		outline: 'focus-visible:outline-violet-600',
	},
} as const
