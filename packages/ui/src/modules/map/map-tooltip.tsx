'use client'

import {
	autoUpdate,
	flip,
	offset,
	shift,
	useClientPoint,
	useFloating,
	useInteractions,
} from '@floating-ui/react'
import { useMemo } from 'react'
import { Swatch, type SwatchProps } from '../../components/swatch'
import { TooltipContent } from '../../components/tooltip'
import { TooltipContext } from '../../components/tooltip/context'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { type MapHoverTarget, useMapHoverState } from './context'
import { categoryLegendId, type MapCategoryMeta } from './map-categories'

/** One resolved overlay entry the tooltip can read. @internal */
export type MapTooltipEntry = {
	label: string
	swatch: 'line' | 'dot'
	/** currentColor class carrying the entry's colour. */
	swatchClass: string
	detail?: string
}

/** Props for {@link MapTooltip}. @internal */
export type MapTooltipProps = {
	/** Region display names by feature index. */
	regionNames: string[]
	/** Each region's category index, `null` where no datum matches. */
	regionCategory: (number | null)[]
	/** Each region's own formatted value (numeric mode); shown instead of the bin
	 * range. `null` in categorical mode, where the category label reads instead. */
	regionValues: (string | null)[]
	categories: MapCategoryMeta[]
	/** Registered overlay entries by legend id. */
	entries: ReadonlyMap<string, MapTooltipEntry>
	/** Toggled-off legend ids; their targets read as no data. */
	hidden: ReadonlySet<string>
}

/** What the tooltip shows for the current target: a title and an optional swatch row. @internal */
type MapTooltipContent = {
	title: string
	/** The swatch reads a currentColor class (`swatchClass`) or an inline CSS colour (`swatchColor`, numeric bins). */
	row?: {
		swatch: 'rect' | 'line' | 'dot'
		swatchClass?: string
		swatchColor?: string
		text: string
	}
}

/** Maps a mark shape to its {@link Swatch} shape. */
const SWATCH_SHAPE = { rect: 'square', line: 'line', dot: 'circle' } as const satisfies Record<
	'rect' | 'line' | 'dot',
	NonNullable<SwatchProps['shape']>
>

/** Resolves the tooltip content for a hover target, or `null` to stay away. @internal */
function resolve(
	target: MapHoverTarget,
	{ regionNames, regionCategory, regionValues, categories, entries, hidden }: MapTooltipProps,
): MapTooltipContent | null {
	if (target.kind === 'entry') {
		if (hidden.has(target.id)) return null

		const entry = entries.get(target.id)

		if (entry === undefined) return null

		return {
			title: entry.label,
			row: entry.detail
				? { swatch: entry.swatch, swatchClass: entry.swatchClass, text: entry.detail }
				: undefined,
		}
	}

	const category = regionCategory[target.index]

	if (category == null) return null

	const meta = categories[category]

	if (meta === undefined || hidden.has(categoryLegendId(meta.value))) return null

	const { paint } = meta

	return {
		title: regionNames[target.index] ?? '',
		row: {
			swatch: 'rect',
			...(paint.kind === 'value' ? { swatchColor: paint.color } : { swatchClass: cn(paint.text) }),
			// A region's own value in numeric mode (its bin only drives the colour);
			// the category label otherwise.
			text: regionValues[target.index] ?? meta.label,
		},
	}
}

/**
 * The hover readout: the pointed region's name over its category, or an
 * overlay's name over its detail. The panel is the real Tooltip component's
 * — `TooltipContent` driven through `TooltipContext` with the map's own
 * floating state, anchored to the pointer through `useClientPoint` — so the
 * map's readout wears exactly the Tooltip chrome, motion, and glass
 * adoption, flipping and shifting at the viewport edges.
 *
 * @remarks A pointer enhancement by design: the same values ship in the
 * visually-hidden table, so nothing is gated behind hover. Regions with no
 * matching datum — and targets whose legend entry is toggled off — read
 * nothing, matching the charts' off-the-marks silence.
 * @internal
 */
export function MapTooltip(props: MapTooltipProps) {
	const { target, point } = useMapHoverState()

	const content = target === null ? null : resolve(target, props)

	const open = content !== null && point !== null

	const { refs, floatingStyles, context } = useFloating({
		open,
		placement: 'top',
		middleware: [offset(12), flip(), shift({ padding: 8 })],
		whileElementsMounted: autoUpdate,
	})

	const clientPoint = useClientPoint(context, { x: point?.x ?? null, y: point?.y ?? null })

	const { getReferenceProps, getFloatingProps } = useInteractions([clientPoint])

	const value = useMemo(
		() => ({
			open,
			interactive: false,
			enabled: true,
			setReference: refs.setReference,
			setFloating: refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
		}),
		[
			open,
			refs.setReference,
			refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
		],
	)

	return (
		<TooltipContext value={value}>
			<TooltipContent size="sm">
				{content && (
					<>
						<div className={cn(k.label, 'whitespace-nowrap', content.row && 'mb-1')}>
							{content.title}
						</div>

						{content.row && (
							<div className="flex items-center gap-1.5 whitespace-nowrap">
								<Swatch
									shape={SWATCH_SHAPE[content.row.swatch]}
									size="sm"
									color={content.row.swatchClass}
									style={content.row.swatchColor ? { color: content.row.swatchColor } : undefined}
								/>

								<span className={cn(k.value)}>{content.row.text}</span>
							</div>
						)}
					</>
				)}
			</TooltipContent>
		</TooltipContext>
	)
}
