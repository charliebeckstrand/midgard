'use client'

import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../core'
import { MapProvider } from './context'
import { loadMapLibre } from './loader'
import type { LngLat } from './types'
import { k } from './variants'

const DEFAULT_STYLE = 'https://demotiles.maplibre.org/style.json'

export type MapProps = {
	center?: LngLat
	zoom?: number
	bearing?: number
	pitch?: number
	style?: string | StyleSpecification
	interactive?: boolean
	className?: string
	children?: React.ReactNode
	onLoad?: (map: MapLibreMap) => void
}

// biome-ignore lint/suspicious/noShadowRestrictedNames: public component name
export function Map({
	center = [0, 0],
	zoom = 2,
	bearing = 0,
	pitch = 0,
	style = DEFAULT_STYLE,
	interactive = true,
	className,
	children,
	onLoad,
}: MapProps) {
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

		loadMapLibre().then(({ Map: MapLibreMapCtor }) => {
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
			})

			mapRef.current = instance

			instance.on('load', () => {
				if (!instance) return

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

	// Stable context — getMap and onReady read from refs, so the value
	// identity never changes across renders.
	const contextValue = useMemo(
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

	return (
		<div
			ref={containerRef}
			data-slot="map"
			data-ready={ready || undefined}
			className={cn(k.base, className)}
		>
			<MapProvider value={contextValue}>{ready ? children : null}</MapProvider>
		</div>
	)
}
