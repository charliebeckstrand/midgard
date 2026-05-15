'use client'

import type { MapLayerMouseEvent } from 'maplibre-gl'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { useMapContext } from './context'
import { MapMarker } from './map-marker'
import { MapRouteTimeline } from './map-route-timeline'
import { type SegmentStatus, toColorMatch, toSegmentCollection } from './map-route-utilities'
import type { RouteData, RouteStop } from './types'

/** Muted grey for the base (unwalked) route. */
const DEFAULT_PENDING_COLOR = '#a1a1aa'
const DEFAULT_ACTIVE_COLOR = '#2563eb'
const DEFAULT_DONE_COLOR = '#16a34a'

/** Invisible click-target layer width, in pixels. */
const HIT_LAYER_WIDTH = 24

export type MapRouteProps = {
	data: RouteData
	/** Line color for each segment status. Defaults: pending=zinc-400, active=blue-600, done=green-600. */
	colors?: Partial<Record<SegmentStatus, string>>
	width?: number
	/** Show a marker at each stop (default: true). */
	showStops?: boolean
	/** Disable the click-to-open Timeline Sheet (default: false). */
	disableInteraction?: boolean
	/** Fires before the default Timeline Sheet opens. Return `false` to prevent the default. */
	onSelect?: (route: RouteData) => boolean | undefined
}

export function MapRoute({
	data,
	colors,
	width = 4,
	showStops = true,
	disableInteraction = false,
	onSelect,
}: MapRouteProps) {
	const { getMap, onReady } = useMapContext()

	const reactId = useId().replace(/[^a-zA-Z0-9_-]/g, '-')

	const sourceId = `map-route-src-${reactId}`

	const layerId = `map-route-layer-${reactId}`

	const hitLayerId = `${layerId}-hit`

	const [open, setOpen] = useState(false)

	const resolvedColors: Record<SegmentStatus, string> = useMemo(
		() => ({
			pending: colors?.pending ?? DEFAULT_PENDING_COLOR,
			active: colors?.active ?? DEFAULT_ACTIVE_COLOR,
			done: colors?.done ?? DEFAULT_DONE_COLOR,
		}),
		[colors?.pending, colors?.active, colors?.done],
	)

	// Layers and event listeners are registered once; this ref carries the
	// latest prop values into both the `onReady` callback (which may fire
	// asynchronously, after props have already changed) and the long-lived
	// map event handlers.
	const latestRef = useRef({ data, resolvedColors, width, disableInteraction, onSelect })

	latestRef.current = { data, resolvedColors, width, disableInteraction, onSelect }

	const handleSelectRef = useRef(() => {
		if (latestRef.current.disableInteraction) return

		const result = latestRef.current.onSelect?.(latestRef.current.data)

		if (result === false) return

		setOpen(true)
	})

	useEffect(() => {
		const cleanup = onReady((map) => {
			map.addSource(sourceId, {
				type: 'geojson',
				data: toSegmentCollection(latestRef.current.data),
			})

			map.addLayer({
				id: layerId,
				type: 'line',
				source: sourceId,
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: {
					'line-color': toColorMatch(latestRef.current.resolvedColors) as never,
					'line-width': latestRef.current.width,
				},
			})

			map.addLayer({
				id: hitLayerId,
				type: 'line',
				source: sourceId,
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': HIT_LAYER_WIDTH },
			})

			const handleClick = (event: MapLayerMouseEvent) => {
				if (latestRef.current.disableInteraction) return

				event.originalEvent.stopPropagation()

				handleSelectRef.current()
			}

			const handleEnter = () => {
				if (!latestRef.current.disableInteraction) map.getCanvas().style.cursor = 'pointer'
			}

			const handleLeave = () => {
				map.getCanvas().style.cursor = ''
			}

			map.on('click', hitLayerId, handleClick)

			map.on('mouseenter', hitLayerId, handleEnter)

			map.on('mouseleave', hitLayerId, handleLeave)
		})

		return () => {
			cleanup?.()

			const map = getMap()

			if (!map) return

			try {
				if (map.getLayer(hitLayerId)) map.removeLayer(hitLayerId)

				if (map.getLayer(layerId)) map.removeLayer(layerId)

				if (map.getSource(sourceId)) map.removeSource(sourceId)
			} catch {
				// Map may already be torn down.
			}
		}
	}, [onReady, getMap, sourceId, layerId, hitLayerId])

	// Sync geometry + segment status when data changes.
	useEffect(() => {
		const map = getMap()

		const source = map?.getSource(sourceId) as
			| { setData: (d: ReturnType<typeof toSegmentCollection>) => void }
			| undefined

		source?.setData(toSegmentCollection(data))
	}, [data, sourceId, getMap])

	// Sync paint props when colors/width change.
	useEffect(() => {
		const map = getMap()

		if (!map?.getLayer(layerId)) return

		map.setPaintProperty(layerId, 'line-color', toColorMatch(resolvedColors))

		map.setPaintProperty(layerId, 'line-width', width)
	}, [resolvedColors, width, layerId, getMap])

	return (
		<>
			{showStops &&
				data.stops.map((stop) => (
					<MapMarker
						key={stop.id}
						position={stop.position}
						onClick={disableInteraction ? undefined : () => handleSelectRef.current()}
					>
						<StopMarker stop={stop} colors={resolvedColors} />
					</MapMarker>
				))}
			<MapRouteTimeline open={open} onOpenChange={setOpen} stops={data.stops} />
		</>
	)
}

function StopMarker({ stop, colors }: { stop: RouteStop; colors: Record<SegmentStatus, string> }) {
	const base =
		stop.status === 'done' ? colors.done : stop.status === 'active' ? colors.active : colors.pending

	return (
		<Tooltip>
			<TooltipTrigger>
				<div
					aria-hidden="true"
					className="size-4.5 rounded-full border-2 shadow hover:scale-110"
					style={{
						backgroundColor: base,
						borderColor: `color-mix(in oklab, ${base} 60%, black)`,
					}}
				/>
			</TooltipTrigger>
			<TooltipContent className="max-w-xs whitespace-normal">
				<div className="font-medium">{stop.name}</div>
				{stop.description && (
					<div className="text-muted-foreground mt-0.5 text-xs">{stop.description}</div>
				)}
			</TooltipContent>
		</Tooltip>
	)
}
