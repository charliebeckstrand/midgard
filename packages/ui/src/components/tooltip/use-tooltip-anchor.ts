'use client'

import type { Placement } from '@floating-ui/react'
import { useInteractions } from '@floating-ui/react'
import { useMemo } from 'react'
import { useFloatingPanel } from '../../hooks'
import type { TooltipContextValue } from './context'

/** Options for {@link useTooltipAnchor}. @internal */
export type TooltipAnchorOptions = {
	/** Whether the label shows; the caller derives it from its own state. */
	open: boolean
	/**
	 * The element to anchor to, or `null` while there is nothing to name. Passed
	 * as floating-ui's reference rather than attached by ref, so the panel can
	 * live in a leaf beside the anchor instead of in whatever renders it.
	 */
	reference: HTMLElement | null
	/**
	 * Preferred side of the anchor; flips and shifts to stay in the viewport.
	 * @defaultValue 'top'
	 */
	placement?: Placement
	/**
	 * Gap (px) the panel keeps from the anchor.
	 * @defaultValue 8 — `useTooltipState`'s own offset, so an anchored label sits
	 *   off its subject by the same gap as every other tooltip in the package.
	 */
	offset?: number
	/**
	 * Whether the panel takes pointer events, and so shields whatever it covers.
	 *
	 * Off by default, because a label that chases the pointer must not stand in
	 * its way. Worth turning on for the other kind — one that names something
	 * *persistently*, over a surface the reader also points at. Left transparent,
	 * that kind hands the pointer through to whatever it happens to cover, which
	 * then answers as though it were being pointed at.
	 *
	 * Prefer this over re-enabling `pointer-events` on the panel's own subtree.
	 * `<FloatingSurface>` drops the wrapper to `none` the moment the panel stops
	 * being real, so that an exiting one cannot swallow what is meant for the page
	 * beneath it — and a descendant that has taken pointer events back is still
	 * hit-tested through that, for the whole length of the exit.
	 * @defaultValue false
	 */
	interactive?: boolean
}

/**
 * Floating state for a tooltip anchored to an element the **caller names**, opened
 * from the caller's own state rather than by a pointer — returned as the
 * {@link TooltipContextValue} a `<TooltipContent>` reads, like its two siblings.
 *
 * The package's third anchoring mode, beside `useTooltipState` (a DOM trigger
 * that takes hover/focus/click) and `useTooltipPointer` (a client point). It
 * exists because neither can name an item in a rendered list:
 *
 * - `useTooltipState` anchors through `<TooltipTrigger>`, which **clones** onto a
 *   child. In a mapped list only the currently-named item could be wrapped, and
 *   wrapping it changes the element type at that position — remounting the item
 *   as it becomes current, which drops whatever focus a roving tab stop just put
 *   there. It also composes hover, click, focus, dismiss and role onto the item,
 *   which a list that already owns those gestures does not want.
 * - `useTooltipPointer` anchors to a captured client point, which drifts as soon
 *   as anything moves the subject — a zoom step, a rotation, a scroll — each of
 *   which would need recomputing by hand. An element reference is re-measured by
 *   `autoUpdate` for free.
 *
 * So: {@link useFloatingPanel}, documented for exactly this, composing your own
 * interaction hooks against the returned context — with none composed. `open` is
 * the caller's fact. `useInteractions([])` supplies the two props getters the
 * context type requires; with no hooks in the list they add nothing, which is the
 * point, since nothing may reach the anchored element.
 *
 * @remarks Stamps no `role` and no aria — like `useTooltipPointer`, and for the
 * same reason: an anchored label names something that is already named to a
 * reader (the item's own accessible name, a live region, or both), so a second
 * announcement would say it twice. Mark the panel's body `aria-hidden`.
 * @internal
 * @see {@link useTooltipPointer} for the point-anchored sibling.
 */
export function useTooltipAnchor({
	open,
	reference,
	placement = 'top',
	offset = 8,
	interactive = false,
}: TooltipAnchorOptions): TooltipContextValue {
	const { refs, floatingStyles } = useFloatingPanel({
		placement,
		// Nothing to anchor to is nothing to show, whatever the caller passed.
		open: open && reference !== null,
		offset,
		reference,
	})

	const { getReferenceProps, getFloatingProps } = useInteractions([])

	return useMemo<TooltipContextValue>(
		() => ({
			open: open && reference !== null,
			// Transparent unless the caller asks otherwise: an anchored label is a name,
			// not somewhere to travel to, so it takes no pointer events over its
			// subject. See the option for the case that wants the opposite.
			interactive,
			enabled: true,
			setReference: refs.setReference,
			setFloating: refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
		}),
		[
			open,
			reference,
			interactive,
			refs.setReference,
			refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
		],
	)
}
