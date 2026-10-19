'use client'

import { type ComponentProps, useMemo } from 'react'
import { cn } from '../../core'
import type { ScaleStep } from '../../core/density'
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion'
import { ReducedMotion } from '../../primitives/reduced-motion'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import { k, type scale } from '../../recipes/kata/sparkline'
import type { AccessibleName } from '../../types'
import { clamp } from '../../utilities'
import { SPARKLINE_METRICS } from './sparkline-constants'
import { type SparklineGeometry, sparklineGeometry } from './sparkline-geometry'

/** The area fill's opacity, sitting the wash under the line without muddying it. @internal */
const AREA_FILL_OPACITY = 0.16

/**
 * The range of `strokeWidth`. The `@minimum` and `@maximum` tags of the prop
 * give the same numbers to the docs.
 * @internal
 */
const STROKE_WIDTH = { min: 1, max: 4 } as const

type SparklineColor = keyof typeof k.color

/**
 * Props for {@link Sparkline}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`), enforced at the type level by `AccessibleName`. A
 * sparkline is `role="img"`, so assistive tech needs a name for it. The root
 * `<span>` takes the rest. The sparkline gives `color` a meaning of its own,
 * and draws its own SVG in place of `children`.
 */
export type SparklineProps = AccessibleName &
	Omit<ComponentProps<'span'>, 'color' | 'children' | 'aria-label' | 'aria-labelledby'> & {
		/**
		 * The series to plot, oldest to newest. An empty array renders an empty box.
		 *
		 * @remarks The projection is memoized on the identity of this array. To
		 * change the series, pass a new array. A series changed in place keeps its
		 * identity, so the sparkline goes on drawing the old values.
		 */
		data: number[]
		/**
		 * Draw the series as a connected line or as discrete bars. The bars and
		 * the area fill sit on zero, clamped into the domain. When the domain
		 * crosses zero, a negative value hangs below the zero line, so a mixed
		 * series reads as wins and losses.
		 * @defaultValue 'line'
		 */
		shape?: 'line' | 'bar'
		/**
		 * The palette color of the series: the line and its area, or the bars.
		 *
		 * @defaultValue 'zinc'
		 */
		color?: SparklineColor
		/**
		 * The density step of the box. Omit it to take the step of the nearest
		 * density scope. A step makes the sparkline a density scope. Each step
		 * is 3:1 (72×24, 96×32, 120×40), so each step is the same drawing at a
		 * different size.
		 */
		size?: ScaleStep<typeof scale>
		/**
		 * Box width in px. With `width` or `height`, the box has a fixed size and
		 * does not follow the density. The other side is then 96 or 32.
		 */
		width?: number
		/** Box height in px. See `width`. */
		height?: number
		/**
		 * Fills the region under the line with a translucent wash. Ignored for the
		 * `bar` shape.
		 * @defaultValue false
		 */
		fill?: boolean
		/**
		 * Marks the last point, the end-of-series value, with a filled dot. Ignored
		 * for the `bar` shape.
		 * @defaultValue false
		 */
		endPoint?: boolean
		/**
		 * Animates the marks in on mount with Framer Motion. The line draws itself
		 * (`pathLength`), the area wash fades in behind it, the end-point pops, and
		 * bars grow from the zero line in sequence. Honors `prefers-reduced-motion`
		 * through {@link ReducedMotion}. Off by default — a static grid of many
		 * sparklines stays a plain-SVG leaf with no motion runtime.
		 *
		 * @remarks The reveal plays on a client mount. A sparkline that the server
		 * renders arrives at rest, because the server cannot read the preference of
		 * the reader. The marks are then visible before the script loads, and they
		 * do not draw again after hydration.
		 * @defaultValue false
		 */
		animate?: boolean
		/**
		 * Line stroke width in px, held between 1 and 4. A thinner line breaks up
		 * at the smallest step. A thicker line fills the dips of a busy series.
		 * @minimum 1
		 * @maximum 4
		 * @defaultValue 1.5
		 */
		strokeWidth?: number
		/**
		 * Domain floor; defaults to the series minimum. Pin it to compare sparklines
		 * on one scale. A value below it clamps to the bottom edge, also when the
		 * whole series is below it.
		 */
		min?: number
		/**
		 * Domain ceiling; defaults to the series maximum. A value above it clamps to
		 * the top edge, also when the whole series is above it.
		 */
		max?: number
	}

/** Shared shape for the static and animated mark renderers. @internal */
type SparklineMarksProps = {
	shape: 'line' | 'bar'
	geometry: SparklineGeometry
	strokeWidth: number
	fill: boolean
	endPoint: boolean
	barRadius: number
	pointRadius: number
	strokeClass: string
	fillClass: string
}

/**
 * The plain-SVG marks: the cheap default, so a grid of many sparklines carries
 * no motion runtime. @internal
 */
function SparklineMarks({
	shape,
	geometry,
	strokeWidth,
	fill,
	endPoint,
	barRadius,
	pointRadius,
	strokeClass,
	fillClass,
}: SparklineMarksProps) {
	if (shape === 'bar') {
		return geometry.bars.map((bar) => (
			<rect
				key={bar.index}
				x={bar.x}
				y={bar.y}
				width={bar.width}
				height={bar.height}
				rx={barRadius}
				className={fillClass}
			/>
		))
	}

	if (!geometry.line) return null

	return (
		<>
			{fill && (
				<path
					d={geometry.area}
					stroke="none"
					fillOpacity={AREA_FILL_OPACITY}
					className={fillClass}
				/>
			)}

			<path
				d={geometry.line}
				fill="none"
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				className={strokeClass}
			/>

			{endPoint && geometry.last && (
				<circle cx={geometry.last.x} cy={geometry.last.y} r={pointRadius} className={fillClass} />
			)}
		</>
	)
}

/**
 * The Framer Motion marks: the same shapes, revealed on mount. Rendered only
 * under `animate` and always wrapped in {@link ReducedMotion}. The grow
 * (`height`), the draw (`pathLength`), and the pop (`r`) are no transform, so
 * the reduced-motion config of that root does not skip them. Under reduced
 * motion the bars, the line, and the end point therefore mount at rest.
 * @internal
 */
function AnimatedSparklineMarks({
	shape,
	geometry,
	strokeWidth,
	fill,
	endPoint,
	barRadius,
	pointRadius,
	strokeClass,
	fillClass,
}: SparklineMarksProps) {
	const still = usePrefersReducedMotion()

	if (shape === 'bar') {
		// `bar.index` paces the stagger too, so a bar rises on its own slot's beat.
		return geometry.bars.map((bar) => (
			<m.rect
				key={bar.index}
				x={bar.x}
				width={bar.width}
				rx={barRadius}
				className={fillClass}
				initial={still ? false : { y: geometry.baseline, height: 0 }}
				animate={{ y: bar.y, height: bar.height }}
				transition={{ ...k.motion.grow, delay: bar.index * k.motion.stagger }}
			/>
		))
	}

	if (!geometry.line) return null

	return (
		<>
			{fill && (
				<m.path
					d={geometry.area}
					stroke="none"
					fillOpacity={AREA_FILL_OPACITY}
					className={fillClass}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={k.motion.fade}
				/>
			)}

			<m.path
				d={geometry.line}
				fill="none"
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				className={strokeClass}
				initial={still ? false : { pathLength: 0 }}
				animate={{ pathLength: 1 }}
				transition={k.motion.draw}
			/>

			{endPoint && geometry.last && (
				<m.circle
					cx={geometry.last.x}
					cy={geometry.last.y}
					className={fillClass}
					initial={still ? false : { r: 0, opacity: 0 }}
					animate={{ r: pointRadius, opacity: 1 }}
					transition={k.motion.land}
				/>
			)}
		</>
	)
}

/**
 * Compact inline trend chart — a line or bar sparkline — rendered as a
 * self-contained, decoration-free SVG (`role="img"`). Sized at the step of
 * the nearest density scope unless `width` / `height` fix it, it maps `data` onto its
 * drawing box through {@link sparklineGeometry}. A flat or single-point series
 * still draws visibly, and a stray non-finite value doesn't collapse the scale.
 *
 * @remarks Built for a {@link Grid} cell — drop it into a column's `cell`
 * renderer — but usable anywhere. In a Grid cell it takes the step of the
 * cells, unless it has an explicit `size`. The accessible name is required by
 * {@link SparklineProps}; summarize the trend (e.g. `aria-label="Revenue, up
 * over 7 days"`) rather than naming the component. Pass `animate` to reveal the
 * marks on mount through Framer Motion; off, it stays a plain-SVG leaf.
 */
export function Sparkline({
	data,
	shape = 'line',
	color = 'zinc',
	size,
	width,
	height,
	fill = false,
	endPoint = false,
	animate = false,
	strokeWidth: rawStrokeWidth = 1.5,
	min,
	max,
	className,
	...props
}: SparklineProps) {
	// An explicit `width` or `height` fixes the box. Otherwise the box is the
	// 3:1 drawing, and the stepped classes of `k.svg` scale it to the step.
	const fixed = width !== undefined || height !== undefined

	const strokeWidth = clamp(rawStrokeWidth, STROKE_WIDTH.min, STROKE_WIDTH.max)

	const boxWidth = width ?? SPARKLINE_METRICS.width

	const boxHeight = height ?? SPARKLINE_METRICS.height

	// Inset enough to keep the stroke and the (optional) end-point marker inside
	// the viewBox; the marker only applies to the line shape.
	const marker = endPoint && shape === 'line'

	const padding = Math.max(strokeWidth / 2, marker ? SPARKLINE_METRICS.pointRadius : 0) + 1

	// A Grid cell holds one sparkline per row, so a grid render pays this
	// projection once per visible row. It rebuilds only when the series or the
	// box changes, which holds while a caller keeps the `data` array stable.
	const geometry = useMemo(
		() =>
			sparklineGeometry(data, {
				width: boxWidth,
				height: boxHeight,
				padding,
				barGap: SPARKLINE_METRICS.barGap,
				min,
				max,
			}),
		[data, boxWidth, boxHeight, padding, min, max],
	)

	const marksProps: SparklineMarksProps = {
		shape,
		geometry,
		strokeWidth,
		fill,
		endPoint,
		barRadius: SPARKLINE_METRICS.barRadius,
		pointRadius: SPARKLINE_METRICS.pointRadius,
		strokeClass: cn(k.color[color].stroke),
		fillClass: cn(k.color[color].fill),
	}

	const svg = (
		<svg
			aria-hidden="true"
			className={fixed ? 'block' : cn(k.svg)}
			width={fixed ? boxWidth : undefined}
			height={fixed ? boxHeight : undefined}
			viewBox={`0 0 ${boxWidth} ${boxHeight}`}
		>
			{animate ? <AnimatedSparklineMarks {...marksProps} /> : <SparklineMarks {...marksProps} />}
		</svg>
	)

	return (
		// The name rides the wrapper (role="img" + the label in props) and the decorative
		// SVG is aria-hidden, so assistive tech reads one summarized image rather
		// than the raw shapes — the same split ProgressGauge uses. Under `animate`,
		// ReducedMotion (MotionConfig) wraps the motion marks so a reduced-motion
		// preference settles them at rest.
		<span
			data-slot="sparkline"
			data-density={size}
			{...props}
			role="img"
			className={cn(k(), className)}
		>
			{animate ? <ReducedMotion>{svg}</ReducedMotion> : svg}
		</span>
	)
}
