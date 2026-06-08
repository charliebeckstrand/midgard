'use client'

import type { MapLayerMouseEvent } from 'maplibre-gl'
import { type RefObject, useEffect } from 'react'
import { useMapContext } from './context'
import { HIT_LAYER_WIDTH } from './map-route-constants'
import { type SegmentStatus, toColorMatch, toSegmentCollection } from './map-route-utilities'
import type { RouteData } from './types'

type LatestProps = {
	data: RouteData
	resolvedColors: Record<SegmentStatus, string>
	width: number
	disableInteraction: boolean
	onSelect?: (route: RouteData) => boolean | undefined
}

type MapRouteLayersArgs = {
	sourceId: string
	layerId: string
	hitLayerId: string
	data: RouteData
	resolvedColors: Record<SegmentStatus, string>
	width: number
	latestRef: RefObject<LatestProps>
	handleSelectRef: RefObject<() => void>
}

export function useMapRouteLayers({
	sourceId,
	layerId,
	hitLayerId,
	data,
	resolvedColors,
	width,
	latestRef,
	handleSelectRef,
}: MapRouteLayersArgs) {
	const { getMap, onReady } = useMapContext()

	useEffect(() => {
		let handlers: {
			click: (event: MapLayerMouseEvent) => void
			enter: () => void
			leave: () => void
		} | null = null

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

			handlers = { click: handleClick, enter: handleEnter, leave: handleLeave }

			map.on('click', hitLayerId, handleClick)

			map.on('mouseenter', hitLayerId, handleEnter)

			map.on('mouseleave', hitLayerId, handleLeave)
		})

		return () => {
			cleanup?.()

			const map = getMap()

			if (!map) return

			try {
				if (handlers) {
					map.off('click', hitLayerId, handlers.click)
					map.off('mouseenter', hitLayerId, handlers.enter)
					map.off('mouseleave', hitLayerId, handlers.leave)
				}

				// Reset the cursor in case the component unmounts while hovered.
				map.getCanvas().style.cursor = ''

				if (map.getLayer(hitLayerId)) map.removeLayer(hitLayerId)

				if (map.getLayer(layerId)) map.removeLayer(layerId)

				if (map.getSource(sourceId)) map.removeSource(sourceId)
			} catch {
				// Map may already be torn down.
			}
		}
	}, [onReady, getMap, sourceId, layerId, hitLayerId, latestRef, handleSelectRef])

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
}
