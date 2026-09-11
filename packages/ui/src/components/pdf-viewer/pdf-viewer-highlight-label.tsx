'use client'

import type { Ref } from 'react'
import { TooltipAnchor } from '../tooltip/tooltip-anchor'

/**
 * The name of the selected region, drawn above it.
 *
 * Because the boxes are the one thing on the page that cannot say what they are. A reviewer
 * arrives here from a list beside the viewer — hovering a field's label selects its region —
 * and on a dense page the ring and the deeper wash say *which* box was picked without saying
 * which of twenty fields picked it. The name is already required of every highlight and
 * already on the region as its `aria-label`; this is the sighted reader's copy of it.
 *
 * @remarks **A leaf, deliberately, and the layer must keep it that way.** Floating-ui commits
 * every reposition through `flushSync`, and `autoUpdate` fires on ancestor scroll, ancestor
 * resize, element resize and layout shift — so holding this state in the layer made one
 * un-batchable re-render of all 20-40 regions per frame of a scroll, on a path whose
 * `regionClass` cache exists to save microseconds. Here the same commit touches three fibers.
 * The layer passes the anchor element down; nothing about the panel's position reaches it.
 *
 * **It takes no pointer events**, persisted or not. A name is not somewhere to travel to, and
 * on a dense page it lands on its neighbours: a reader who wants the box under it must be able
 * to point at the box, not at the name of another one. The layer answers for what that opens —
 * it fades the name over a box the pointer is reading, and it refuses to put the selection down
 * for a press that landed on the name and on nothing else.
 *
 * `aria-hidden`: the region carries this exact string as its `aria-label` and the layer
 * announces it through a live region besides, so a third copy would have a reader hear one
 * selection named twice.
 * @internal
 */
export function PdfViewerHighlightLabel({
	anchor,
	label,
	open,
	className,
	ref,
}: {
	/**
	 * The region's element, or `null` when there is none to name.
	 *
	 * `null` closes the panel rather than unmounting this — {@link useTooltipAnchor} folds it
	 * into `open`, and `FloatingSurface` holds an exiting subtree at the props it last had. An
	 * early return here would tear the panel out mid-fade, which is why the name used to arrive
	 * with an entrance and leave without one.
	 */
	anchor: HTMLElement | null
	/** The region's name, or `null` when there is none. Held through the exit; see `anchor`. */
	label: string | null
	/**
	 * Whether the overlay is drawn. Gated on it because a hidden layer is `hidden` rather than
	 * unmounted — the selection survives a reader looking at the page underneath — and this
	 * panel portals out of the layer, so `hidden` does not reach it and it would otherwise
	 * float over a box that is not on screen.
	 */
	open: boolean
	/** Class for the panel, which is what the layer fades. */
	className?: string
	/**
	 * Ref to the name itself.
	 *
	 * The layer measures the panel around it — `parentElement` — because that box, padding and
	 * all, is what stands over the page. It is the box the layer tests a pointer against.
	 */
	ref?: Ref<HTMLSpanElement>
}) {
	return (
		<TooltipAnchor
			open={open}
			reference={anchor}
			placement="top"
			offset={8}
			size="sm"
			className={className}
		>
			<span
				ref={ref}
				data-slot="pdf-viewer-highlight-label"
				aria-hidden="true"
				className="whitespace-nowrap"
			>
				{label}
			</span>
		</TooltipAnchor>
	)
}
