'use client'

import { type CSSProperties, type ReactNode, useId } from 'react'
import { Swatch } from '../../components/swatch'
import { cn } from '../../core'
import { type ChartSeriesColor, k } from '../../recipes/kata/chart'
import type { SeriesPaint } from './chart-series'

/** The pattern tile edge, in `viewBox` units — the hatch repeats every `TILE`. @internal */
const TILE = 8

/** Hatch stroke width and dot radius, sized so the tile reads as a fill, not a grid. @internal */
const STROKE = 1.3
const DOT = 1.6

/**
 * One slot's texture tile: an optional rotation of the whole tiling and either
 * a line path (`d`, optionally `dash`ed) or a centred `dot`.
 *
 * @internal
 */
type Texture = { transform?: string; d?: string; dash?: boolean; dot?: boolean }

/**
 * The texture ladder, keyed to the categorical slot order: two hatch angles,
 * the axis-aligned lines, two crosses, then dots and a dashed diagonal — eight
 * shapes distinct enough that a series reads by its fill alone when colour
 * can't carry it (forced-colors, print, severe CVD). The `zinc` de-emphasis
 * slot sits outside the order and falls back to the first hatch.
 *
 * @internal
 */
const TEXTURES: readonly Texture[] = [
	{ transform: 'rotate(45)', d: `M0,0 V${TILE}` },
	{ transform: 'rotate(-45)', d: `M0,0 V${TILE}` },
	{ d: `M0,0 V${TILE}` },
	{ d: `M0,0 H${TILE}` },
	{ d: `M0,0 V${TILE} M0,0 H${TILE}` },
	{ transform: 'rotate(45)', d: `M0,0 V${TILE} M0,0 H${TILE}` },
	{ dot: true },
	{ transform: 'rotate(45)', d: `M0,0 V${TILE}`, dash: true },
]

/** The tile for a slot, by its place in the fixed order; off-order slots hatch. @internal */
function textureFor(color: ChartSeriesColor): Texture {
	const index = (k.order as readonly ChartSeriesColor[]).indexOf(color)

	return TEXTURES[index] ?? (TEXTURES[0] as Texture)
}

/**
 * The hatch drawn over a tile's hue wash. White in both modes so it reads as a
 * streak across the 500/600 fills; `CanvasText` under forced colours, where the
 * wash drops to `Canvas` and the shape's angle carries the identity.
 *
 * @internal
 */
const LINE_INK = cn('stroke-white', 'forced-color-adjust-none', 'forced-colors:stroke-[CanvasText]')
const DOT_INK = cn('fill-white', 'forced-color-adjust-none', 'forced-colors:fill-[CanvasText]')

/** The tile's inner mark: a dot grid, or the (optionally dashed) hatch lines. @internal */
function hatch(texture: Texture): ReactNode {
	if (texture.dot) {
		return <circle cx={TILE / 2} cy={TILE / 2} r={DOT} fillOpacity={0.7} className={DOT_INK} />
	}

	return (
		<path
			d={texture.d}
			fill="none"
			strokeWidth={STROKE}
			strokeOpacity={0.6}
			strokeDasharray={texture.dash ? '2.5 2.5' : undefined}
			className={LINE_INK}
		/>
	)
}

/** One tile to define: the slot's hue paint and the scoped `id` the marks reference. @internal */
export type ChartPatternEntry = { color: ChartSeriesColor; paint: SeriesPaint; id: string }

/**
 * The `<defs>` block of texture tiles — one per distinct slot in use, a hue
 * wash under the slot's hatch. Mounted inside the chart SVG; a mark fills from a
 * tile by its `id`.
 *
 * @internal
 */
export function ChartPatternDefs({ entries }: { entries: ChartPatternEntry[] }) {
	if (entries.length === 0) return null

	return (
		<defs data-slot="chart-patterns">
			{entries.map(({ color, paint, id }) => {
				const texture = textureFor(color)

				return (
					<pattern
						key={id}
						id={id}
						patternUnits="userSpaceOnUse"
						width={TILE}
						height={TILE}
						patternTransform={texture.transform}
					>
						{/* The hue wash reads as the series colour normally, dropping to the
						    system background under forced colours so the hatch stays legible. */}
						<rect
							width={TILE}
							height={TILE}
							className={cn(paint.fill, 'forced-color-adjust-none', 'forced-colors:fill-[Canvas]')}
						/>

						{hatch(texture)}
					</pattern>
				)
			})}
		</defs>
	)
}

/** Everything a chart needs to paint its marks with textures. @internal */
export type ChartTexture = {
	/** The `<defs>` to mount inside the SVG — the tiles for the slots in use. */
	defs: ReactNode
	/** The tile fill URL for a slot — each mark set maps its own metas' colours. */
	fillFor: (color: ChartSeriesColor) => string
	/** The `texture` prop: tiles paint in every mode, not only forced-colors / print. */
	active: boolean
}

/**
 * Assembles a chart's texture tiles and a slot-keyed fill resolver. The
 * `<defs>` and URLs are always built — a mark applies them in every mode when
 * `active`, or only where colour is gone (forced colours, print) otherwise — so
 * a chart survives High Contrast Mode without opting in. Tiles de-dupe to the
 * distinct slots, so a two-series chart defines two, not eight; pass every
 * visible series so a combo's bars and areas both resolve.
 *
 * @internal
 */
export function useChartTexture(
	active: boolean,
	series: { color: ChartSeriesColor; paint: SeriesPaint }[],
): ChartTexture {
	// React's useId carries colons — safe as an attribute, but not inside the
	// url() a CSS class reads — so strip them for the referenced pattern ids.
	const base = useId().replace(/:/g, '')

	const idFor = (color: ChartSeriesColor) => `chart-tx-${base}-${color}`

	const distinct = new Map<ChartSeriesColor, SeriesPaint>()

	for (const entry of series) if (!distinct.has(entry.color)) distinct.set(entry.color, entry.paint)

	const entries = [...distinct].map(([color, paint]) => ({ color, paint, id: idFor(color) }))

	return {
		defs: <ChartPatternDefs entries={entries} />,
		fillFor: (color) => `url(#${idFor(color)})`,
		active,
	}
}

/** The legend swatch's texture-overlay viewBox — a small tile over the colour key. @internal */
const SWATCH_BOX = 12

/**
 * A legend swatch that mirrors a textured mark: the shared colour key with, for
 * a square (bar / slice) swatch, the slot's hatch laid over it — always when the
 * `texture` prop is on, else only under forced colours and print, where the
 * legend's colour key collapses to one system colour. A `line` swatch is only
 * 2px tall — too thin to hatch — and its stroke mark carries no fill, so it
 * stays colour-only.
 *
 * @internal
 */
export function ChartSwatch({
	swatch,
	swatchClass,
	color,
	active,
	off,
}: {
	swatch: 'rect' | 'line'
	swatchClass: string
	color?: ChartSeriesColor
	active: boolean
	off: boolean
}) {
	const id = `chart-sw-${useId().replace(/:/g, '')}`

	if (swatch !== 'rect' || !color) {
		return (
			<Swatch
				shape={swatch === 'rect' ? 'square' : 'line'}
				color={swatchClass}
				className={cn(off && 'opacity-40')}
			/>
		)
	}

	const texture = textureFor(color)

	// The overlay rides inside the swatch box, keeping the swatch's DOM slot; it
	// shows on screen only when the prop is on, else waits for forced colours and
	// print, where the legend's colour key collapses to one system colour.
	return (
		<Swatch
			shape="square"
			color={swatchClass}
			className={cn('relative overflow-hidden', off && 'opacity-40')}
		>
			<svg
				aria-hidden="true"
				viewBox={`0 0 ${SWATCH_BOX} ${SWATCH_BOX}`}
				className={cn(
					'pointer-events-none absolute inset-0 size-full',
					active ? 'block' : 'hidden forced-colors:block print:block',
				)}
			>
				<defs>
					<pattern
						id={id}
						patternUnits="userSpaceOnUse"
						width={TILE}
						height={TILE}
						patternTransform={texture.transform}
					>
						<rect
							width={TILE}
							height={TILE}
							className={cn(
								k.series[color].fill,
								'forced-color-adjust-none',
								'forced-colors:fill-[Canvas]',
							)}
						/>

						{hatch(texture)}
					</pattern>
				</defs>

				<rect
					width={SWATCH_BOX}
					height={SWATCH_BOX}
					fill={`url(#${id})`}
					className="forced-color-adjust-none"
				/>
			</svg>
		</Swatch>
	)
}

/** The inline style carrying a mark's tile fill, read by {@link textureClass}. @internal */
export function textureStyle(fill: string | undefined): CSSProperties | undefined {
	return fill ? ({ '--chart-fill': fill } as CSSProperties) : undefined
}

/**
 * Fill classes for a textured mark. The tile fill wins with `!` over the slot's
 * colour class: always when `active`, else only under forced colours and print,
 * where the colour channel is already gone. `forced-color-adjust-none` keeps
 * the browser from overriding the tile fill with a system colour.
 *
 * @internal
 */
export function textureClass(active: boolean, fill: string | undefined): string | false {
	if (!fill) return false

	return active
		? 'forced-color-adjust-none [fill:var(--chart-fill)]!'
		: 'forced-color-adjust-none forced-colors:[fill:var(--chart-fill)]! print:[fill:var(--chart-fill)]!'
}
