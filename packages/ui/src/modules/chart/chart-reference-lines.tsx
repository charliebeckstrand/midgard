import { cn } from '../../core'
import { k } from '../../recipes/kata/chart'
import { REFERENCE_LABEL_GAP } from './chart-constants'
import type { PlotRect } from './chart-layout'
import { bandExtent, type ChartOrientation, project } from './chart-orientation'
import type { LinearScale } from './chart-scale'
import type { ChartReferenceLine } from './chart-schema'

/** Props for {@link ChartReferenceLines}. @internal */
export type ChartReferenceLinesProps = {
	plot: PlotRect
	/** The resolved value scale, or `null` before a domain resolves — nothing draws then. */
	scale: LinearScale | null
	/** The reference lines to draw, or none; non-finite values are skipped. */
	reference: ChartReferenceLine[] | undefined
	/**
	 * Which way the value axis runs — vertical draws horizontal rules, horizontal
	 * draws vertical ones, mirroring {@link ChartGridLines}.
	 * @defaultValue 'vertical'
	 */
	orientation?: ChartOrientation
}

/** Where a reference line's end label anchors: past the far band end, off the rule. @internal */
export function referenceLabelAnchor(orientation: ChartOrientation, plot: PlotRect, at: number) {
	if (orientation === 'vertical') {
		return {
			x: plot.x + plot.width - REFERENCE_LABEL_GAP,
			y: at - REFERENCE_LABEL_GAP,
			textAnchor: 'end' as const,
			dominantBaseline: 'auto' as const,
		}
	}

	return {
		x: at + REFERENCE_LABEL_GAP,
		y: plot.y + REFERENCE_LABEL_GAP,
		textAnchor: 'start' as const,
		dominantBaseline: 'hanging' as const,
	}
}

/**
 * Reference lines at fixed values, drawn across the band axis — the same
 * value→project→draw path as {@link ChartGridLines}, but on a raw domain value
 * and over the marks instead of under them, so a target or threshold reads
 * against the data rather than hiding behind it. Each rule dashes by default and
 * takes a neutral ink until a slot colour is set; an optional label rides its
 * far end.
 *
 * @remarks Self-gating: a chart mounts it unconditionally and it draws nothing
 * until both a scale and reference lines exist, so the gate lives here instead
 * of at every call site.
 * @internal
 */
export function ChartReferenceLines({
	plot,
	scale,
	reference,
	orientation = 'vertical',
}: ChartReferenceLinesProps) {
	if (!scale || !reference || reference.length === 0) return null

	const [from, to] = bandExtent(orientation, plot)

	return (
		<g data-slot="chart-reference-lines">
			{reference.map((line) => {
				if (!Number.isFinite(line.value)) return null

				const at = scale.map(line.value)

				const start = project(orientation, at, from)

				const end = project(orientation, at, to)

				const paint = k.series[line.color ?? 'zinc']

				const label = line.label ? referenceLabelAnchor(orientation, plot, at) : null

				return (
					<g key={`${line.value}:${line.label ?? ''}`} data-slot="chart-reference-line">
						<line
							x1={start.x}
							y1={start.y}
							x2={end.x}
							y2={end.y}
							strokeWidth={1}
							strokeDasharray={line.dashed === false ? undefined : '4 3'}
							className={cn(paint.stroke)}
						/>

						{label && (
							<text
								data-slot="chart-reference-label"
								x={label.x}
								y={label.y}
								textAnchor={label.textAnchor}
								dominantBaseline={label.dominantBaseline}
								className={cn(k.tick, paint.fill)}
							>
								{line.label}
							</text>
						)}
					</g>
				)
			})}
		</g>
	)
}
