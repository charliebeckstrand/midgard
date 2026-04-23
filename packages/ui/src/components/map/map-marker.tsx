'use client'

import type { Marker as MapLibreMarker } from 'maplibre-gl'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMapContext } from './context'
import { loadMapLibre } from './loader'
import type { LngLat } from './types'

export type MapMarkerProps = {
	position: LngLat
	anchor?:
		| 'center'
		| 'top'
		| 'bottom'
		| 'left'
		| 'right'
		| 'top-left'
		| 'top-right'
		| 'bottom-left'
		| 'bottom-right'
	onClick?: () => void
	className?: string
	children?: ReactNode
}

export function MapMarker({
	position,
	anchor = 'center',
	onClick,
	className,
	children,
}: MapMarkerProps) {
	const { onReady } = useMapContext()

	const markerRef = useRef<MapLibreMarker | null>(null)

	const [element, setElement] = useState<HTMLDivElement | null>(null)

	// Mount the marker once; sync position / anchor / className below.
	const mountPropsRef = useRef({ position, anchor, className })

	mountPropsRef.current = { position, anchor, className }

	useEffect(() => {
		let cancelled = false

		let cleanup: (() => void) | undefined

		loadMapLibre().then(({ Marker }) => {
			if (cancelled) return

			const init = mountPropsRef.current

			const el = document.createElement('div')

			el.dataset.slot = 'map-marker'

			if (init.className) el.className = init.className

			const marker = new Marker({ element: el, anchor: init.anchor })

			markerRef.current = marker

			setElement(el)

			cleanup = onReady((map) => {
				marker.setLngLat(init.position).addTo(map)
			})
		})

		return () => {
			cancelled = true

			cleanup?.()

			markerRef.current?.remove()

			markerRef.current = null

			setElement(null)
		}
	}, [onReady])

	useEffect(() => {
		markerRef.current?.setLngLat(position)
	}, [position])

	const onClickRef = useRef(onClick)

	onClickRef.current = onClick

	useEffect(() => {
		if (!element) return

		const handle = (event: MouseEvent) => {
			event.stopPropagation()

			onClickRef.current?.()
		}

		element.addEventListener('click', handle)

		return () => element.removeEventListener('click', handle)
	}, [element])

	if (!element) return null

	return createPortal(children ?? <DefaultPin />, element)
}

function DefaultPin() {
	return (
		<div
			aria-hidden="true"
			className="size-4 rounded-full border-2 border-white bg-blue-600 shadow-md"
		/>
	)
}
