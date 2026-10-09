'use client'

import { createContext } from '../../core'
import type { LightboxPhoto } from './types'

/** The state that a {@link Lightbox} root gives to its triggers and its viewer. @internal */
export type LightboxContextValue = {
	photos: readonly LightboxPhoto[]
	/**
	 * The index of the photo that the viewer shows, or `null` while the viewer
	 * is closed. It holds the last photo through the flight back to its
	 * thumbnail, so that thumbnail stays empty until the photo lands in it.
	 */
	shown: number | null
	/** Opens the viewer at a photo. */
	show: (index: number) => void
	/** Records the image of the thumbnail of a photo. It returns the cleanup that removes it. */
	register: (index: number, image: HTMLImageElement) => () => void
	/** The image of the thumbnail of a photo, if a trigger renders one. */
	thumbnail: (index: number) => HTMLImageElement | undefined
}

/**
 * Reads the state of the enclosing {@link Lightbox}. It throws outside a root.
 *
 * @internal
 */
export const [LightboxContext, useLightboxContext] = createContext<LightboxContextValue>('Lightbox')
