'use client'

import { type ReactNode, useRef, useState } from 'react'
import { useControllable } from '../../hooks/use-controllable'
import { Overlay } from '../../primitives/overlay'
import { LightboxContext, type LightboxContextValue } from './context'
import { LightboxStage } from './lightbox-stage'
import type { LightboxPhoto } from './types'

/** Props for {@link Lightbox}: the photos, the open photo, and the names of the viewer and its controls. */
export type LightboxProps = {
	/** The photos, in the order that the viewer steps through them. */
	photos: readonly LightboxPhoto[]
	/**
	 * The index of the photo that the viewer shows, controlled. `null` keeps the
	 * viewer closed and controlled.
	 */
	index?: number | null
	/** The index of the photo that the viewer shows first, uncontrolled. */
	defaultIndex?: number
	/** Fires with the index of the photo that the viewer shows, or `null` when it closes. */
	onIndexChange?: (index: number | null) => void
	/** The accessible name of the viewer. @defaultValue 'Photos' */
	'aria-label'?: string
	/** The accessible name of the close button. @defaultValue 'Close' */
	closeLabel?: string
	/** The accessible name of the button that shows the photo before. @defaultValue 'Previous photo' */
	previousLabel?: string
	/** The accessible name of the button that shows the photo after. @defaultValue 'Next photo' */
	nextLabel?: string
	/** The thumbnails (`LightboxTrigger`), in any layout. */
	children: ReactNode
}

/**
 * A viewer for one photo or for a set of photos. Each `LightboxTrigger` in the
 * root shows the thumbnail of a photo. A press on a thumbnail raises its photo
 * from the place of the thumbnail to a modal stage. When the viewer closes, the
 * photo goes back into the thumbnail of the photo on the stage.
 *
 * With more than one photo, the viewer steps through them. The previous and
 * next buttons, `ArrowLeft` and `ArrowRight`, and a swipe on the stage step in
 * the reading order. Escape, the close button, and a press on the stage
 * outside the photo close the viewer, and the focus goes back to the
 * thumbnail.
 *
 * The open photo is controlled (`index`/`onIndexChange`) or uncontrolled
 * (`defaultIndex`). Give each photo a `width` and a `height`, so its box is
 * correct before it loads.
 *
 * @example
 * ```tsx
 * <Lightbox photos={photos}>
 *   {photos.map((photo, index) => (
 *     <LightboxTrigger key={photo.src} index={index} className="aspect-square" />
 *   ))}
 * </Lightbox>
 * ```
 *
 * @remarks The raise and the return move `transform` and `clip-path` through
 * Motion, so they run off the main thread. Under reduced motion, or when the
 * thumbnail is not on the screen, the photo fades in and out on the stage. The
 * viewer renders in the `Overlay` primitive, which traps the focus and locks
 * the scroll of the page.
 */
export function Lightbox({
	photos,
	index: indexProp,
	defaultIndex,
	onIndexChange,
	'aria-label': ariaLabel = 'Photos',
	closeLabel = 'Close',
	previousLabel = 'Previous photo',
	nextLabel = 'Next photo',
	children,
}: LightboxProps) {
	const [index, setIndex] = useControllable<number>({
		value: indexProp,
		defaultValue: defaultIndex,
		onValueChange: onIndexChange,
	})

	const open = index !== undefined && index >= 0 && index < photos.length

	// The photo on the stage. It holds the last photo through the return, and the
	// thumbnail of that photo stays empty until the photo lands in it.
	const [shown, setShown] = useState<number | null>(open ? index : null)

	if (open && shown !== index) setShown(index)

	const thumbnails = useRef(new Map<number, HTMLImageElement>())

	const context: LightboxContextValue = {
		photos,
		shown,
		show: setIndex,
		register: (slot, image) => {
			thumbnails.current.set(slot, image)

			return () => {
				if (thumbnails.current.get(slot) === image) thumbnails.current.delete(slot)
			}
		},
		thumbnail: (slot) => thumbnails.current.get(slot),
	}

	return (
		<LightboxContext value={context}>
			{children}
			<Overlay
				open={open}
				onOpenChange={(next) => {
					if (!next) setIndex(null)
				}}
				backdrop={false}
				dismissOnBackdrop={false}
			>
				{shown !== null && (
					<LightboxStage
						index={shown}
						onIndexChange={setIndex}
						onReturn={() => setShown(null)}
						labels={{
							viewer: ariaLabel,
							close: closeLabel,
							previous: previousLabel,
							next: nextLabel,
						}}
					/>
				)}
			</Overlay>
		</LightboxContext>
	)
}
