'use client'

import type { MapLayerMouseEvent } from 'maplibre-gl'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Sheet, SheetBody, SheetDescription, SheetTitle } from '../sheet'
import {
	Timeline,
	TimelineDescription,
	TimelineHeading,
	TimelineItem,
	TimelineTimestamp,
} from '../timeline'
import { useMapContext } from './context'
import { MapMarker } from './map-marker'
import type { LngLat, RouteData } from './types'

type SegmentStatus = 'pending' | 'active' | 'done'

/** Muted grey for the base (unwalked) route. */
const DEFAULT_PENDING_COLOR = '#a1a1aa'
const DEFAULT_ACTIVE_COLOR = '#2563eb'
const DEFAULT_DONE_COLOR = '#16a34a'

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

	// Interactive handlers may change per render; the click listener is attached
	// once and reads the latest versions via this ref.
	const handlersRef = useRef({ data, disableInteraction, onSelect })

	handlersRef.current = { data, disableInteraction, onSelect }

	// Mount layers once; geometry / paint sync effects below keep them current.
	const mountDataRef = useRef(data)

	const mountColorsRef = useRef(resolvedColors)

	const mountWidthRef = useRef(width)

	mountDataRef.current = data

	mountColorsRef.current = resolvedColors

	mountWidthRef.current = width

	useEffect(() => {
		const cleanup = onReady((map) => {
			map.addSource(sourceId, {
				type: 'geojson',
				data: toSegmentCollection(mountDataRef.current),
			})

			map.addLayer({
				id: layerId,
				type: 'line',
				source: sourceId,
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: {
					'line-color': toColorMatch(mountColorsRef.current) as never,
					'line-width': mountWidthRef.current,
				},
			})

			// Invisible, wider layer for easier hit testing.
			map.addLayer({
				id: hitLayerId,
				type: 'line',
				source: sourceId,
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 24 },
			})

			const handleClick = (event: MapLayerMouseEvent) => {
				if (handlersRef.current.disableInteraction) return

				event.originalEvent.stopPropagation()

				const result = handlersRef.current.onSelect?.(handlersRef.current.data)

				if (result === false) return

				setOpen(true)
			}

			const handleEnter = () => {
				if (!handlersRef.current.disableInteraction) map.getCanvas().style.cursor = 'pointer'
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
					<MapMarker key={stop.id} position={stop.position}>
						<StopDot status={stop.status} colors={resolvedColors} />
					</MapMarker>
				))}
			<Sheet open={open} onOpenChange={setOpen} size="sm">
				<SheetTitle>Route timeline</SheetTitle>
				{data.stops.length > 0 && (
					<SheetDescription>
						{data.stops.length} stop{data.stops.length === 1 ? '' : 's'}
					</SheetDescription>
				)}
				<SheetBody>
					<Timeline>
						{data.stops.map((stop) => {
							const formatted = formatTimestamp(stop.timestamp)

							return (
								<TimelineItem
									key={stop.id}
									color={stopStatusColor(stop.status)}
									pulse={stop.status === 'active'}
								>
									<TimelineHeading>{stop.name}</TimelineHeading>
									{formatted && <TimelineTimestamp>{formatted}</TimelineTimestamp>}
									{stop.description && (
										<TimelineDescription>{stop.description}</TimelineDescription>
									)}
								</TimelineItem>
							)
						})}
					</Timeline>
				</SheetBody>
			</Sheet>
		</>
	)
}

/**
 * Build one GeoJSON LineString feature per segment between consecutive stops,
 * tagged with the status that determines its color.
 *
 * Segment rule: a segment inherits its starting stop's status; a done → active
 * transition keeps the completed portion green up to the current position.
 */
function toSegmentCollection(data: RouteData) {
	const path: LngLat[] = data.path ?? data.stops.map((s) => s.position)

	const segments: Array<{
		type: 'Feature'
		geometry: { type: 'LineString'; coordinates: LngLat[] }
		properties: { status: SegmentStatus; index: number }
	}> = []

	for (let i = 0; i < path.length - 1; i++) {
		const from = data.stops[i]?.status

		const to = data.stops[i + 1]?.status

		let status: SegmentStatus = 'pending'

		if (from === 'done' && (to === 'done' || to === 'active')) status = 'done'
		else if (from === 'active' || to === 'active') status = 'active'
		else if (from === 'done') status = 'done'

		segments.push({
			type: 'Feature',
			geometry: { type: 'LineString', coordinates: [path[i], path[i + 1]] },
			properties: { status, index: i },
		})
	}

	return { type: 'FeatureCollection' as const, features: segments }
}

function toColorMatch(colors: Record<SegmentStatus, string>) {
	return [
		'match',
		['get', 'status'],
		'done',
		colors.done,
		'active',
		colors.active,
		colors.pending,
	] as const
}

function formatTimestamp(ts?: string | Date) {
	if (!ts) return null

	const date = typeof ts === 'string' ? new Date(ts) : ts

	if (Number.isNaN(date.getTime())) return null

	return date.toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	})
}

function stopStatusColor(status?: string) {
	if (status === 'done') return 'green'

	if (status === 'active') return 'blue'

	return 'zinc'
}

function StopDot({
	status,
	colors,
}: {
	status?: SegmentStatus
	colors: Record<SegmentStatus, string>
}) {
	const fill =
		status === 'done' ? colors.done : status === 'active' ? colors.active : colors.pending

	return (
		<div
			aria-hidden="true"
			className="size-3 rounded-full border-2 border-white shadow dark:border-zinc-950"
			style={{ backgroundColor: fill }}
		/>
	)
}
