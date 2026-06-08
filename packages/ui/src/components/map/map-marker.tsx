'use client'

import type { Marker as MapLibreMarker } from 'maplibre-gl'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMapContext } from './context'
import { loadMapLibre } from './map-loader'
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
	/**
	 * Accessible name for an interactive marker. The default pin is decorative
	 * (`aria-hidden`), so a clickable marker with no labelled children needs this
	 * to be usable by screen readers (WCAG 4.1.2).
	 */
	'aria-label'?: string
	className?: string
	children?: ReactNode
}

export function MapMarker({
	position,
	anchor = 'center',
	onClick,
	'aria-label': ariaLabel,
	className,
	children,
}: MapMarkerProps) {
	const { onReady } = useMapContext()

	const interactive = onClick != null

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

		const activate = () => onClickRef.current?.()

		const handleClick = (event: MouseEvent) => {
			event.stopPropagation()

			activate()
		}

		element.addEventListener('click', handleClick)

		if (!interactive) return () => element.removeEventListener('click', handleClick)

		// Promote the element to a button with a tab stop and Enter/Space
		// activation (WCAG 2.1.1 / 4.1.2).
		element.setAttribute('role', 'button')

		element.tabIndex = 0

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'Enter' && event.key !== ' ') return

			event.preventDefault()
			event.stopPropagation()

			activate()
		}

		element.addEventListener('keydown', handleKeyDown)

		return () => {
			element.removeEventListener('click', handleClick)
			element.removeEventListener('keydown', handleKeyDown)
			element.removeAttribute('role')
			element.removeAttribute('tabindex')
		}
	}, [element, interactive])

	useEffect(() => {
		if (!element) return

		if (interactive && ariaLabel != null) element.setAttribute('aria-label', ariaLabel)
		else element.removeAttribute('aria-label')
	}, [element, interactive, ariaLabel])

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
