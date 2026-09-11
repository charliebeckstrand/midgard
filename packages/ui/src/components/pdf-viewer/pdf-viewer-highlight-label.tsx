'use client'

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
 * `aria-hidden`: the region carries this exact string as its `aria-label` and the layer
 * announces it through a live region besides, so a third copy would have a reader hear one
 * selection named twice.
 * @internal
 */
export function PdfViewerHighlightLabel({
	anchor,
	label,
	open,
	shield = false,
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
	/**
	 * Whether the panel takes the pointer off whatever it covers.
	 *
	 * Off by default, and rightly: a name that follows the pointer must not stand in its way.
	 * But a name that *persists* is a standing object over a layer of pressable boxes, and a
	 * transparent one hands the pointer straight through to the box beneath — which then names
	 * itself too, a second panel a few pixels under the first, for a box the reader is not
	 * pointing at.
	 *
	 * The cost is that a press landing on the chip presses nothing. That is the honest reading
	 * of it — no name and no ring under the pointer is the page saying there is nothing here to
	 * press — and the layer's handlers already fold a press outside a region into a no-op, so it
	 * costs the selection nothing either.
	 * @defaultValue false
	 */
	shield?: boolean
}) {
	return (
		<TooltipAnchor
			open={open}
			reference={anchor}
			placement="top"
			offset={8}
			size="sm"
			interactive={shield}
		>
			<span data-slot="pdf-viewer-highlight-label" aria-hidden="true" className="whitespace-nowrap">
				{label}
			</span>
		</TooltipAnchor>
	)
}
