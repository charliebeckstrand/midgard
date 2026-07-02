'use client'

import { motion } from 'motion/react'
import { cn } from '../../core'
import { useResolvedSize } from '../../primitives/density'
import { ReducedMotion } from '../../primitives/reduced-motion'
import type { Step } from '../../recipes'
import { k } from '../../recipes/kata/sparkline'
import type { AccessibleName } from '../../types'
import { SPARKLINE_METRICS } from './sparkline-constants'
import { type SparklineGeometry, sparklineGeometry } from './sparkline-geometry'

/** The area fill's opacity, sitting the wash under the line without muddying it. @internal */
const AREA_FILL_OPACITY = 0.16

/** Line-draw stroke reveal (`pathLength` 0 → 1). @internal */
const LINE_DRAW = { duration: 0.7, ease: 'easeInOut' } as const

/** Area wash fade, trailing the line so it fills in as the stroke crosses it. @internal */
const AREA_FADE = { duration: 0.5, delay: 0.15 } as const

/** End-point pop, held until the line has finished drawing. @internal */
const POINT_POP = { duration: 0.25, delay: LINE_DRAW.duration } as const

/** Per-bar grow from the baseline. @internal */
const BAR_GROW = { duration: 0.4, ease: 'easeOut' } as const

/** Delay step between adjacent bars, so they rise in sequence. @internal */
const BAR_STAGGER = 0.05

type SparklineColor = keyof typeof k.color

/**
 * Props for {@link Sparkline}. Requires an accessible name (`aria-label` or
 * `aria-labelledby`), enforced at the type level by `AccessibleName` — a
 * sparkline is `role="img"`, so assistive tech needs a name for it.
 */
export type SparklineProps = AccessibleName & {
	/** The series to plot, oldest to newest. An empty array renders an empty box. */
	data: number[]
	/**
	 * Draw the series as a connected line or as discrete bars.
	 * @defaultValue 'line'
	 */
	variant?: 'line' | 'bar'
	/** @defaultValue 'zinc' */
	color?: SparklineColor
	/** Resolves against enclosing Density; sets the default drawing box and mark scale. */
	size?: Step
	/** Coordinate-box width in px; overrides the density default. */
	width?: number
	/** Coordinate-box height in px; overrides the density default. */
	height?: number
	/**
	 * Fill the region under the line with a translucent wash. Ignored for the
	 * `bar` variant.
	 * @defaultValue false
	 */
	fill?: boolean
	/**
	 * Mark the last point with a filled dot — the end-of-series value. Ignored for
	 * the `bar` variant.
	 * @defaultValue false
	 */
	endPoint?: boolean
	/**
	 * Animate the marks in on mount with Framer Motion: the line draws itself
	 * (`pathLength`), the area wash fades in behind it, the end-point pops, and
	 * bars rise from the baseline in sequence. Honours `prefers-reduced-motion`
	 * through {@link ReducedMotion}. Off by default — a static grid of many
	 * sparklines stays a plain-SVG leaf with no motion runtime.
	 * @defaultValue false
	 */
	animate?: boolean
	/**
	 * Line stroke width in px.
	 * @defaultValue 1.5
	 */
	strokeWidth?: number
	/** Domain floor; defaults to the series minimum. Pin it to compare sparklines on one scale. */
	min?: number
	/** Domain ceiling; defaults to the series maximum. */
	max?: number
	className?: string
}

/** Shared shape for the static and animated mark renderers. @internal */
type SparklineMarksProps = {
	variant: 'line' | 'bar'
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
	variant,
	geometry,
	strokeWidth,
	fill,
	endPoint,
	barRadius,
	pointRadius,
	strokeClass,
	fillClass,
}: SparklineMarksProps) {
	if (variant === 'bar') {
		return geometry.bars.map((bar) => (
			<rect
				key={bar.x}
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
 * under `animate` and always wrapped in {@link ReducedMotion}, so a
 * reduced-motion preference settles them at their final state. @internal
 */
function AnimatedSparklineMarks({
	variant,
	geometry,
	strokeWidth,
	fill,
	endPoint,
	barRadius,
	pointRadius,
	strokeClass,
	fillClass,
}: SparklineMarksProps) {
	if (variant === 'bar') {
		return geometry.bars.map((bar, index) => (
			<motion.rect
				key={bar.x}
				x={bar.x}
				width={bar.width}
				rx={barRadius}
				className={fillClass}
				initial={{ y: geometry.baseline, height: 0 }}
				animate={{ y: bar.y, height: bar.height }}
				transition={{ ...BAR_GROW, delay: index * BAR_STAGGER }}
			/>
		))
	}

	if (!geometry.line) return null

	return (
		<>
			{fill && (
				<motion.path
					d={geometry.area}
					stroke="none"
					fillOpacity={AREA_FILL_OPACITY}
					className={fillClass}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={AREA_FADE}
				/>
			)}

			<motion.path
				d={geometry.line}
				fill="none"
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				className={strokeClass}
				initial={{ pathLength: 0 }}
				animate={{ pathLength: 1 }}
				transition={LINE_DRAW}
			/>

			{endPoint && geometry.last && (
				<motion.circle
					cx={geometry.last.x}
					cy={geometry.last.y}
					className={fillClass}
					initial={{ r: 0, opacity: 0 }}
					animate={{ r: pointRadius, opacity: 1 }}
					transition={POINT_POP}
				/>
			)}
		</>
	)
}

/**
 * Compact inline trend chart — a line or bar sparkline — rendered as a
 * self-contained, decoration-free SVG (`role="img"`). Sized from enclosing
 * Density unless `width` / `height` override it, it maps `data` onto its
 * drawing box through {@link sparklineGeometry}: a flat or single-point series
 * still draws visibly, and a stray non-finite value doesn't collapse the scale.
 *
 * @remarks Built for a {@link Grid} cell — drop it into a column's `cell`
 * renderer — but usable anywhere. In a density-aware Grid it tracks the grid's
 * `density` (which broadcasts onto the enclosing Density) unless given an explicit
 * `size`. The accessible name is required by
 * {@link SparklineProps}; summarize the trend (e.g. `aria-label="Revenue, up
 * over 7 days"`) rather than naming the component. Pass `animate` to reveal the
 * marks on mount through Framer Motion; off, it stays a plain-SVG leaf.
 */
export function Sparkline({
	data,
	variant = 'line',
	color = 'zinc',
	size,
	width,
	height,
	fill = false,
	endPoint = false,
	animate = false,
	strokeWidth = 1.5,
	min,
	max,
	className,
	...labelProps
}: SparklineProps) {
	const resolvedSize = useResolvedSize(size)

	const metrics = SPARKLINE_METRICS[resolvedSize as Step] ?? SPARKLINE_METRICS.md

	const boxWidth = width ?? metrics.width

	const boxHeight = height ?? metrics.height

	// Inset enough to keep the stroke and the (optional) end-point marker inside
	// the viewBox; the marker only applies to the line variant.
	const padding = Math.max(strokeWidth / 2, endPoint ? metrics.pointRadius : 0) + 1

	const geometry = sparklineGeometry(data, {
		width: boxWidth,
		height: boxHeight,
		padding,
		barGap: metrics.barGap,
		min,
		max,
	})

	const marksProps: SparklineMarksProps = {
		variant,
		geometry,
		strokeWidth,
		fill,
		endPoint,
		barRadius: metrics.barRadius,
		pointRadius: metrics.pointRadius,
		strokeClass: cn(k.color[color].stroke),
		fillClass: cn(k.color[color].fill),
	}

	const svg = (
		<svg
			aria-hidden="true"
			className="block"
			width={boxWidth}
			height={boxHeight}
			viewBox={`0 0 ${boxWidth} ${boxHeight}`}
		>
			{animate ? <AnimatedSparklineMarks {...marksProps} /> : <SparklineMarks {...marksProps} />}
		</svg>
	)

	return (
		// The name rides the wrapper (role="img" + labelProps) and the decorative
		// SVG is aria-hidden, so assistive tech reads one summarized image rather
		// than the raw shapes — the same split ProgressGauge uses. Under `animate`,
		// ReducedMotion (MotionConfig) wraps the motion marks so a reduced-motion
		// preference settles them at rest.
		<span data-slot="sparkline" role="img" {...labelProps} className={cn(k(), className)}>
			{animate ? <ReducedMotion>{svg}</ReducedMotion> : svg}
		</span>
	)
}
