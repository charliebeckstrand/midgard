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
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { useMapContext } from './context'
import { MapMarker } from './map-marker'
import type { LngLat, RouteData, RouteStop } from './types'

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

	const handleSelectRef = useRef(() => {
		if (handlersRef.current.disableInteraction) return

		const result = handlersRef.current.onSelect?.(handlersRef.current.data)

		if (result === false) return

		setOpen(true)
	})

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

				handleSelectRef.current()
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

	const currentIndex = resolveCurrentIndex(data.stops)

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
			<Sheet open={open} onOpenChange={setOpen} size="sm">
				<SheetTitle>Route timeline</SheetTitle>
				{data.stops.length > 0 && (
					<SheetDescription>
						{data.stops.length} stop{data.stops.length === 1 ? '' : 's'}
					</SheetDescription>
				)}
				<SheetBody>
					<Timeline>
						{data.stops.map((stop, index) => {
							const isCompleted = index < currentIndex

							const isCurrent = index === currentIndex

							const isReached = isCompleted || isCurrent

							const isFinal = isCurrent && index === data.stops.length - 1

							const timestamp = formatTimestamp(stop.timestamp)

							return (
								<TimelineItem
									key={stop.id}
									active={isCurrent}
									variant={isReached ? 'solid' : 'outline'}
									status={isCompleted || isFinal ? 'active' : isCurrent ? 'info' : 'inactive'}
									pulse={isCurrent && !isFinal}
									lineBefore={isReached ? 'green' : undefined}
									lineAfter={isCompleted ? 'green' : undefined}
								>
									{timestamp && <TimelineTimestamp>{timestamp}</TimelineTimestamp>}
									<TimelineHeading>{stop.name}</TimelineHeading>
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
		const fromPoint = path[i]

		const toPoint = path[i + 1]

		if (!fromPoint || !toPoint) continue

		const from = data.stops[i]?.status

		const to = data.stops[i + 1]?.status

		let status: SegmentStatus = 'pending'

		if (from === 'done' && (to === 'done' || to === 'active')) status = 'done'
		else if (from === 'active' || to === 'active') status = 'active'
		else if (from === 'done') status = 'done'

		segments.push({
			type: 'Feature',
			geometry: { type: 'LineString', coordinates: [fromPoint, toPoint] },
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

function resolveCurrentIndex(stops: RouteData['stops']) {
	const activeIndex = stops.findIndex((s) => s.status === 'active')

	if (activeIndex !== -1) return activeIndex

	const doneCount = stops.filter((s) => s.status === 'done').length

	return Math.min(doneCount, Math.max(stops.length - 1, 0))
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
