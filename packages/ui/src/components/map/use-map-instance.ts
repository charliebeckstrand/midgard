'use client'

import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl'
import { type RefObject, useEffect, useMemo, useRef, useState } from 'react'
import type { MapContextValue } from './context'
import { loadMapLibre } from './map-loader'
import type { LngLat } from './types'

export type UseMapInstanceOptions = {
	center: LngLat
	zoom: number
	bearing: number
	pitch: number
	style: string | StyleSpecification
	interactive: boolean
	onLoad?: (map: MapLibreMap) => void
}

export type UseMapInstanceResult = {
	containerRef: RefObject<HTMLDivElement | null>
	contextValue: MapContextValue
	ready: boolean
}

/**
 * Owns the MapLibre instance lifecycle: construction, ready/load handlers,
 * jumpTo-on-prop-change, setStyle-on-prop-change, and ResizeObserver-driven
 * `map.resize()`. The instance is constructed once with the latest props read
 * through a ref, since MapLibre is expensive to recreate.
 */
export function useMapInstance({
	center,
	zoom,
	bearing,
	pitch,
	style,
	interactive,
	onLoad,
}: UseMapInstanceOptions): UseMapInstanceResult {
	const containerRef = useRef<HTMLDivElement>(null)

	const mapRef = useRef<MapLibreMap | null>(null)

	const readyRef = useRef(false)

	const readyListenersRef = useRef(new Set<(map: MapLibreMap) => void>())

	const [ready, setReady] = useState(false)

	// Keep a ref of the props the mount-effect needs so the effect itself can
	// run once (the MapLibre instance is expensive to recreate) while still
	// reading the latest values.
	const mountPropsRef = useRef({ center, zoom, bearing, pitch, style, interactive, onLoad })

	mountPropsRef.current = { center, zoom, bearing, pitch, style, interactive, onLoad }

	useEffect(() => {
		if (!containerRef.current || mapRef.current) return

		const container = containerRef.current

		let cancelled = false

		let instance: MapLibreMap | null = null

		// Require Shift+wheel to zoom; plain wheel passes through to page scroll.
		// Capture phase fires before MapLibre's handler on the inner canvas container,
		// so stopImmediatePropagation prevents the event from reaching it.
		const wheelHandler = (e: WheelEvent) => {
			if (!e.shiftKey) e.stopImmediatePropagation()
		}

		container.addEventListener('wheel', wheelHandler, { capture: true })

		loadMapLibre().then(({ Map: MapLibreMapCtor, AttributionControl }) => {
			if (cancelled || !containerRef.current) return

			const init = mountPropsRef.current

			instance = new MapLibreMapCtor({
				container: containerRef.current,
				style: init.style,
				center: init.center,
				zoom: init.zoom,
				bearing: init.bearing,
				pitch: init.pitch,
				interactive: init.interactive,
				attributionControl: false,
			})

			mapRef.current = instance

			instance.on('load', () => {
				if (!instance) return

				instance.addControl(new AttributionControl({ compact: true }))

				readyRef.current = true

				setReady(true)

				for (const cb of readyListenersRef.current) cb(instance)

				mountPropsRef.current.onLoad?.(instance)
			})
		})

		return () => {
			cancelled = true

			container.removeEventListener('wheel', wheelHandler, { capture: true })

			instance?.remove()

			mapRef.current = null

			readyRef.current = false

			readyListenersRef.current.clear()

			setReady(false)
		}
	}, [])

	useEffect(() => {
		const map = mapRef.current

		if (!map || !ready) return

		map.jumpTo({ center, zoom, bearing, pitch })
	}, [center, zoom, bearing, pitch, ready])

	const appliedStyleRef = useRef(style)

	useEffect(() => {
		const map = mapRef.current

		if (!map || !ready) return

		if (appliedStyleRef.current === style) return

		appliedStyleRef.current = style

		map.setStyle(style)
	}, [style, ready])

	// MapLibre measures the container at construction and won't reflow when the
	// container resizes (responsive layout, sidebar collapse, etc.) without a
	// nudge — so the canvas would stay at its initial size and clip or stretch.
	useEffect(() => {
		const map = mapRef.current

		const container = containerRef.current

		if (!map || !container || !ready) return

		const observer = new ResizeObserver(() => map.resize())

		observer.observe(container)

		return () => observer.disconnect()
	}, [ready])

	// Stable context — getMap and onReady read from refs, so the value
	// identity never changes across renders.
	const contextValue = useMemo<MapContextValue>(
		() => ({
			getMap: () => mapRef.current,
			onReady: (cb: (map: MapLibreMap) => void) => {
				const current = mapRef.current

				if (current && readyRef.current) {
					cb(current)

					return () => {}
				}

				readyListenersRef.current.add(cb)

				return () => {
					readyListenersRef.current.delete(cb)
				}
			},
		}),
		[],
	)

	return { containerRef, contextValue, ready }
}
