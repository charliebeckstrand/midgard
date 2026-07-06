import type { ReactNode } from 'react'
import { AspectRatio } from '../../components/aspect-ratio'
import type { FrameReserve } from '../../hooks'

/** Props for {@link ChartPlotBox}. @internal */
type ChartPlotBoxProps = {
	/** How the box reserves its height from its own width, or `null` for a pixel height. */
	reserve: FrameReserve | null
	/** The drawing height in px, used when nothing is reserved from the width. */
	height: number
	/**
	 * Fill the region's own height rather than reserving one: the plot is a
	 * `flex-1` child whose height the figure's `aspect-ratio` (or the container)
	 * already set, and the box takes all of it — the legend-inside-the-aspect-box
	 * and free-form `fill` cases, where the drawing height is measured, not
	 * reserved from the width.
	 * @defaultValue false
	 */
	fill?: boolean
	/** The SVG that fills the box; may be `false` before the width is measured. */
	children: ReactNode
}

/**
 * The `content` reserve as a `padding-bottom` length: `max(min, width ± offset)`
 * — a share of the width shifted by the pixel offset, floored at the minimum so
 * a box narrower than the offset holds `min` instead of clamping to nothing.
 *
 * @internal
 */
function contentPadding(offset: number, min: number): string {
	const shifted = offset < 0 ? `calc(100% - ${-offset}px)` : `calc(100% + ${offset}px)`

	return `max(${min}px, ${shifted})`
}

/**
 * The plot region's drawing box, shared by the chart and map frames. It
 * reserves its height from its own width so the frame holds steady before the
 * width is measured and across animation replays: an `aspect` reserve holds a
 * `width / height` ratio through CSS `aspect-ratio`, and a `content` reserve
 * holds the `max(min, width + offset)` — the affine height a
 * ratio can't express — through a padding box, whose percentage padding is
 * likewise a share of the box's own width. With nothing reserved (`fixed`) the
 * box takes the pixel `height` directly; under `fill` it takes the whole height
 * its `flex-1` region already holds.
 *
 * @internal
 */
export function ChartPlotBox({ reserve, height, fill = false, children }: ChartPlotBoxProps) {
	if (fill) return <div className="size-full">{children}</div>

	if (reserve === null) return <div style={{ height }}>{children}</div>

	if (reserve.mode === 'aspect') return <AspectRatio ratio={reserve.ratio}>{children}</AspectRatio>

	// `aspect-ratio` can't add a pixel offset, so reserve `width + offset` with the
	// classic padding box: the empty box's own height stays the percentage padding,
	// and the absolutely-placed child fills the height it opens.
	return (
		<div
			className="relative overflow-hidden"
			style={{ paddingBottom: contentPadding(reserve.offset, reserve.min) }}
		>
			<div className="absolute inset-0">{children}</div>
		</div>
	)
}
