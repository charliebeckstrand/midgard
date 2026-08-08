'use client'

import type { ReactNode } from 'react'
import { MapZoomContext } from './context'
import { type MapZoomOptions, useMapZoom } from './use-map-zoom'

/** Props for {@link MapZoomProvider}: what the plat knows, plus what it wraps. @internal */
type MapZoomProviderProps = MapZoomOptions & {
	children: ReactNode
}

/**
 * Owns the view transform and hands it to the three things that read it: the
 * layer that draws through it, the plot region that carries the gestures, and
 * the keyboard cursor that anchors against it.
 *
 * It sits here, below {@link MapPlat} and around the plot alone, for the reason
 * {@link MapHoverProvider} does. A gesture writes on every wheel notch and every
 * tracked pointer move; held on the plat, each of those writes would re-render
 * the plat, re-plan its legend, and rebuild the derivations the mount depends
 * on. Held here, the provider re-renders and its `children` — one stable element
 * the plat built — bail, so a notch reaches the layer, the plot region, and the
 * marks that read the zoom's scale, and nothing else.
 *
 * The legend is deliberately outside it: it answers the toggles and the
 * emphasis, never the view.
 *
 * @internal
 */
export function MapZoomProvider({ children, ...options }: MapZoomProviderProps) {
	const zoom = useMapZoom(options)

	return <MapZoomContext value={zoom}>{children}</MapZoomContext>
}
