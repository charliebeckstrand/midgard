import type { ReactElement, ReactNode } from 'react'
import type { AccessibleName } from '../../../../types'
import { ChartCartesianLegend } from '../chart-legend/cartesian'
import type { ResolvedLegend } from '../chart-legend/schema'
import type { ChartTexture } from '../chart-pattern-defs'
import type { ChartReferenceLine } from '../chart-reference-lines'
import { ChartReferenceList } from '../chart-reference-lines'
import type { CartesianChart } from '../use-chart-cartesian'
import { ChartFrame, type ChartFrameProps } from './frame'

/** Props for {@link ChartCartesianFrame}. @internal */
export type ChartCartesianFrameProps = AccessibleName &
	Pick<ChartFrameProps, 'title' | 'subtitle' | 'contextMenu'> & {
		/** The resolved chart the frame reads its sizing, tier, legend, and readout off. */
		chart: CartesianChart
		/** The `legend` prop resolved to its show value, placement, and inert flag. */
		resolvedLegend: ResolvedLegend
		/** The texture defs and per-slot fills, mounted first inside the plot. */
		tex: ChartTexture
		/** A fresh copy of the chart for the menu's fullscreen view. */
		fullscreen: ReactElement
		/** Mount the hover tooltip. */
		showTooltip: boolean
		/** Snap targets when the crosshair snaps — chart-specific, so it stays a prop. */
		snap: ChartFrameProps['snap']
		/** The keyboard tab stops — chart-specific (reference roving, stack folding), so it stays a prop. */
		focus: ChartFrameProps['focus']
		/** The reference lines for the annotation parity outside the plot. */
		reference: ChartReferenceLine[] | undefined
		className?: string
		/** The plot's own layer stack, in the order the chart draws it. */
		children: ReactNode
	}

/**
 * The frame scaffold every cartesian chart (bar, line, area, combo) shares: the
 * {@link ChartFrame} wired to the resolved chart's sizing, tier, cartesian
 * legend, readout, and reference annotations, with the texture defs mounted
 * ahead of the chart's own layers. Hook-free — the entry components own every
 * hook and hand the resolved values in — so it adds no hook to their order and
 * never rebuilds their layers. Only the genuinely per-chart pieces stay props:
 * the fullscreen copy, the snap and focus targets (each engine derives them from
 * its own marks), and the `children` layer stack, whose draw order is the
 * chart's to own (a bar draws its marks before the crosshair, the line charts
 * after).
 *
 * @internal
 */
export function ChartCartesianFrame({
	chart,
	resolvedLegend,
	tex,
	fullscreen,
	showTooltip,
	snap,
	focus,
	reference,
	className,
	children,
	...label
}: ChartCartesianFrameProps) {
	return (
		<ChartFrame
			{...label}
			fullscreen={fullscreen}
			ref={chart.ref}
			width={chart.width}
			fixedWidth={chart.fixedWidth}
			height={chart.height}
			reserve={chart.reserve}
			fill={chart.fill}
			aspect={chart.outerAspect ?? undefined}
			tier={chart.tier}
			legend={
				<ChartCartesianLegend
					chart={chart}
					legend={resolvedLegend.value}
					inert={resolvedLegend.inert}
					texture={tex.active}
				/>
			}
			legendPlacement={resolvedLegend.placement}
			readout={chart.readout}
			readoutOrder={chart.readoutOrder}
			emphasis={chart.emphasis}
			tooltip={showTooltip}
			snap={snap}
			focus={focus}
			onActiveSeries={chart.setEmphasis}
			orientation={chart.orientation}
			className={className}
			annotations={
				<ChartReferenceList
					reference={reference}
					hidden={chart.referenceHidden}
					format={chart.formatAxisValue}
				/>
			}
		>
			{tex.defs}

			{children}
		</ChartFrame>
	)
}
