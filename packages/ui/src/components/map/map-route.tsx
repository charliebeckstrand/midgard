'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip'
import { MapMarker } from './map-marker'
import {
	DEFAULT_ACTIVE_COLOR,
	DEFAULT_DONE_COLOR,
	DEFAULT_PENDING_COLOR,
} from './map-route-constants'
import { MapRouteTimeline } from './map-route-timeline'
import type { SegmentStatus } from './map-route-utilities'
import type { RouteData, RouteStop } from './types'
import { useMapRouteLayers } from './use-map-route-layers'

const ID_SANITIZE_RE = /[^a-zA-Z0-9_-]/g

export type MapRouteProps = {
	data: RouteData
	/** Line color for each segment status. Defaults: pending=zinc-400, active=blue-600, done=green-600. */
	colors?: Partial<Record<SegmentStatus, string>>
	width?: number
	/** Show a marker at each stop. Defaults to `true`. */
	showStops?: boolean
	/** Disable the click-to-open Timeline Sheet. Defaults to `false`. */
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
	const reactId = useId().replace(ID_SANITIZE_RE, '-')

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

	useMapRouteLayers({
		sourceId,
		layerId,
		hitLayerId,
		data,
		resolvedColors,
		width,
		latestRef,
		handleSelectRef,
	})

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
				<button
					type="button"
					aria-label={stop.name}
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
