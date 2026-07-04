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
import { TooltipContent } from '../../components/tooltip'
import { TooltipContext } from '../../components/tooltip/context'
import { cn } from '../../core'
import { k } from '../../recipes/kata/map'
import { type MapHoverTarget, useMapHoverState } from './context'
import type { MapCategoryMeta } from './map-categories'

/** One resolved overlay entry the tooltip can read. @internal */
export type MapTooltipEntry = {
	label: string
	swatch: 'line' | 'dot'
	/** Background class carrying the entry's colour. */
	swatchClass: string
	detail?: string
}

/** Props for {@link MapTooltip}. @internal */
export type MapTooltipProps = {
	/** Region display names by feature index. */
	regionNames: string[]
	/** Each region's category index, `null` where no datum matches. */
	regionCategory: (number | null)[]
	categories: MapCategoryMeta[]
	/** Registered overlay entries by legend id. */
	entries: ReadonlyMap<string, MapTooltipEntry>
	/** Toggled-off legend ids; their targets read as no data. */
	hidden: ReadonlySet<string>
}

/** What the tooltip shows for the current target: a title and an optional swatch row. @internal */
type MapTooltipContent = {
	title: string
	row?: { swatch: 'rect' | 'line' | 'dot'; swatchClass: string; text: string }
}

/** The swatch classes per shape, mirroring the pointed mark. @internal */
function swatchShape(swatch: 'rect' | 'line' | 'dot'): string {
	if (swatch === 'rect') return 'size-2 rounded-xs'

	if (swatch === 'dot') return 'size-2 rounded-full'

	return 'h-0.5 w-2.5 rounded-full'
}

/** Resolves the tooltip content for a hover target, or `null` to stay away. @internal */
function resolve(
	target: MapHoverTarget,
	{ regionNames, regionCategory, categories, entries, hidden }: MapTooltipProps,
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

	if (category == null || hidden.has(`category:${category}`)) return null

	const meta = categories[category]

	if (meta === undefined) return null

	return {
		title: regionNames[target.index] ?? '',
		row: { swatch: 'rect', swatchClass: cn(meta.paint.bg), text: meta.label },
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
								<span className={cn(swatchShape(content.row.swatch), content.row.swatchClass)} />

								<span className={cn(k.value)}>{content.row.text}</span>
							</div>
						)}
					</>
				)}
			</TooltipContent>
		</TooltipContext>
	)
}
