/**
 * Sen focus: how an element signals keyboard focus. Each named shape covers
 * one pattern that the library uses:
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
 *   - `within`    inset ring on a box whose child control has the focus,
 *                 such as a row with an affix, for a control that cannot
 *                 draw its own ring around its neighbors
 *   - `indicator` background-paint marker on `::after`, in the focus-ring
 *                 color, for a focused tab. On the current tab, it paints
 *                 over the selection bar, so the current tab also shows
 *                 focus.
 *   - `parent`    the `ring` stroke on a part whose parent has the focus
 *   - `lifted`    z-shift + shadow for a picked-up element, plus the violet
 *                 accent that reads against the panel backdrop. Split into
 *                 `raise` and one entry per indicator shape, because the host
 *                 that lifts is not always the host that takes focus. A
 *                 reorderable List row raises the `<li>` but seats the Tab
 *                 stop on its content area when that content is activatable.
 *                 Tailwind extracts whole class names, so the accent cannot be
 *                 interpolated into a shape. Stating both here is what keeps
 *                 one edit enough to change it everywhere. Forced colors
 *                 remove the shadow and force the accent, so under forced
 *                 colors a lift draws a 4 px outline, twice the width of a
 *                 focus outline.
 *
 * Layer: kiso · Concern: focus indicators
 */

import { forced } from './forced'

/**
 * The forced-colors mark of a lift: a 4 px `Highlight` outline inside the box.
 * Forced colors remove the shadow of the raise and force the violet accent to
 * the focus color, so without the mark a lifted host looks the same as a
 * focused host. The outline is twice the width of a focus outline. It stays
 * inside the box, so a list that clips its rows does not cut it.
 */
const liftMark = [
	'forced-colors:outline-solid forced-colors:outline-4',
	'forced-colors:-outline-offset-4 forced-colors:outline-[Highlight]',
]

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
	// The ring has no gate, so a resting forced-colors outline of the same
	// element (`sen.forced.outline` on a solid or a soft Button day cell)
	// outranks its width. The ring repeats its width behind the same gate.
	virtual: [
		'outline-solid outline-2 outline-offset-2',
		'outline-blue-600',
		'forced-colors:outline-2',
	],
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
	 * The `ring` stroke on a part whose parent has the keyboard focus. The `…`
	 * mark of a hidden breadcrumb crumb draws it, because the mark stands in
	 * for its link on the line.
	 */
	parent: [
		'[:focus-visible>&]:outline-2 [:focus-visible>&]:outline-offset-2',
		'[:focus-visible>&]:outline-blue-600',
	],
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
		/**
		 * The raise itself, for whichever box is picked up. The `!` beats the inline
		 * `z-index` that Motion's `Reorder.Item` writes on a row of a List.
		 */
		raise: ['z-10!', 'shadow-md', ...liftMark],
		/**
		 * The forced-colors mark of a lift alone, for a lifted box that keeps a raise
		 * of its own, such as the card of a Dashboard tile.
		 */
		mark: liftMark,
		/**
		 * Violet accent for a lifted host whose indicator is an inset ring. When the
		 * raised box holds the focus itself, its focus fallback (`forced.ring.inset`)
		 * is behind the `focus-visible` gate, so it overrides the mark. Thus the
		 * accent also gives that fallback the width and the offset of the mark.
		 */
		ring: [
			'focus-visible:ring-violet-600',
			'forced-colors:focus-visible:outline-4 forced-colors:focus-visible:-outline-offset-4',
		],
		/** Violet accent for a lifted host whose indicator is an outset outline. */
		outline: 'focus-visible:outline-violet-600',
		/**
		 * The forced-colors mark of a lift behind the `data-dragging` gate, for a box
		 * that is lifted only while it is dragged, such as a Grid row or column. It
		 * has the width and the offset of {@link liftMark}.
		 */
		dragging: [
			'forced-colors:data-dragging:outline-solid forced-colors:data-dragging:outline-4',
			'forced-colors:data-dragging:-outline-offset-4 forced-colors:data-dragging:outline-[Highlight]',
		],
	},
} as const
