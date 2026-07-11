'use client'

import { createContext } from '../../core'

/**
 * Ambient marker that content sits inside a tile host — a dashboard tile,
 * today. Unlike the {@link ../drag-handle | drag-handle} channel, which the
 * host provides only while its content is draggable, this stands whenever the
 * content is tiled, so chrome inside can co-style against the host's padded
 * card at rest: a chart's spark veil reads it to bleed flush to the tile edge
 * (cancelling the tile's content padding) and become a click target rather
 * than the inline overlay it draws standalone. `false` outside any tile host.
 *
 * The channel carries presence, not styling or behaviour: the host only
 * declares that its content is tiled; the content decides what to do with it.
 */
const [TileSurfaceContext, useTileSurface] = createContext<boolean>('TileSurface', {
	default: false,
})

export { TileSurfaceContext, useTileSurface }
