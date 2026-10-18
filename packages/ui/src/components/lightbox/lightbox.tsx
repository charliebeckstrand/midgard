'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'
import { useControllable } from '../../hooks/use-controllable'
import { defineMessages, intlMessages } from '../../primitives/intl/intl-messages'
import { useIntl } from '../../primitives/intl/use-intl'
import { Overlay } from '../../primitives/overlay'
import { LightboxContext, type LightboxContextValue } from './context'
import { LightboxStage } from './lightbox-stage'
import { thumbnailOf, viewablePhotos } from './lightbox-utilities'
import type { LightboxLoad, LightboxPhoto } from './types'

const messages = defineMessages({
	photos: {
		id: 'ui.lightbox.photos',
		defaultMessage: 'Photos',
		description: 'The name of the photo viewer.',
	},
	previous: {
		id: 'ui.lightbox.previous',
		defaultMessage: 'Previous photo',
		description: 'The name of the button that shows the photo before.',
	},
	next: {
		id: 'ui.lightbox.next',
		defaultMessage: 'Next photo',
		description: 'The name of the button that shows the photo after.',
	},
})

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
	/**
	 * Fires with the index of the photo that the viewer shows, or `null` when it
	 * closes. The viewer also closes, and reports `null`, when its photo leaves
	 * `photos` or its thumbnail does not load.
	 */
	onIndexChange?: (index: number | null) => void
	/**
	 * Shows a close button, one gap above the photo. Without it, Escape, a press
	 * outside the photo, and a swipe up or down (in any direction for one photo) close the viewer, and the close
	 * button shows only when it has the keyboard focus.
	 * @defaultValue false
	 */
	closable?: boolean
	/**
	 * Shows the previous button, the count, and the next button in one pill,
	 * one gap below the photo, when there is more than one photo. With
	 * `thumbnails`, a row of thumbnails takes the place of the pill. Without
	 * them, the arrow keys and a swipe still step.
	 * @defaultValue true
	 */
	controls?: boolean
	/**
	 * Shows a row of thumbnails of the photos in place of the pill of `controls`.
	 * The thumbnail of the photo that the viewer shows is solid, and the others
	 * are dim. A press on a thumbnail shows its photo. The row scrolls when the
	 * thumbnails do not fit, and it keeps the current thumbnail in its center.
	 * @defaultValue false
	 */
	thumbnails?: boolean
	/**
	 * Blurs the page behind the scrim. The blur fades in and out with the scrim,
	 * and the scrim lets more of the page through.
	 * @defaultValue true
	 */
	blur?: boolean
	/** The accessible name of the viewer. @defaultValue `'Photos'`, in the language of the reader. */
	'aria-label'?: string
	/** The accessible name of the close button. @defaultValue `'Close'`, in the language of the reader. */
	closeLabel?: string
	/** The accessible name of the button that shows the photo before. @defaultValue `'Previous photo'`, in the language of the reader. */
	previousLabel?: string
	/** The accessible name of the button that shows the photo after. @defaultValue `'Next photo'`, in the language of the reader. */
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
 * the reading order. With `thumbnails`, a row of thumbnails takes the place of
 * the step buttons, and a press on a thumbnail shows its photo. Escape, the close button, and a press on the stage
 * outside the photo close the viewer, and the focus goes back to the
 * thumbnail.
 *
 * A pinch zooms the photo, up to four times its size, and a double tap or a
 * double click zooms into the point that it taps. A double tap on a zoomed
 * photo takes it back to rest. A swipe on a zoomed photo moves it and does
 * not step or close. A step takes the photo back to rest. On the keyboard,
 * `+` and `-` zoom about the center of the stage, and `0` takes the photo back
 * to rest. The arrow keys move a zoomed photo and do not step.
 *
 * The open photo is controlled (`index`/`onIndexChange`) or uncontrolled
 * (`defaultIndex`). Give each photo a `width` and a `height` when they are
 * known, so its box is correct before it loads. Without them, the root reads
 * the size of the thumbnail when it loads, and the thumbnail is disabled until
 * then. A thumbnail that does not load stays as a still placeholder, and the
 * viewer steps over its photo.
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
 * @remarks The raise and the return move only `transform` through Motion, so
 * the browser does not paint the photo again in each frame. The corners of the
 * photo are square in the flight. Under reduced motion, or when the
 * thumbnail is not on the screen, the photo fades in and out on the stage. The
 * viewer renders in the `Overlay` primitive, which traps the focus and locks
 * the scroll of the page. The viewer covers the `Chrome` regions of the app
 * too, and the focus does not go to them while it is open.
 */
export function Lightbox({
	photos,
	index: indexProp,
	defaultIndex,
	onIndexChange,
	closable = false,
	controls = true,
	thumbnails = false,
	blur = true,
	'aria-label': ariaLabel,
	closeLabel,
	previousLabel,
	nextLabel,
	children,
}: LightboxProps) {
	const intl = useIntl()

	const [index, setIndex] = useControllable<number>({
		value: indexProp,
		defaultValue: defaultIndex,
		onValueChange: onIndexChange,
	})

	// How each thumbnail loaded, by its URL. A URL can show in more than one photo.
	const [loads, setLoads] = useState<ReadonlyMap<string, LightboxLoad>>(() => new Map())

	const loadOf = (source: string) => loads.get(source)

	const viewable = viewablePhotos(photos, loadOf)

	const open = index !== undefined && viewable.some((photo) => photo.index === index)

	// The photo of `index` left `photos`, or its thumbnail loaded and gave it no
	// box, so the viewer cannot show it. The viewer closes and reports it, so
	// that the photo does not open by itself when `photos` grows back. A photo
	// whose thumbnail still loads waits.
	const indexPhoto = index === undefined ? undefined : photos[index]

	const gone =
		index !== undefined && !open && (!indexPhoto || loadOf(thumbnailOf(indexPhoto)) !== undefined)

	useEffect(() => {
		if (gone) setIndex(null)
	}, [gone, setIndex])

	// The photo on the stage. It holds the last photo through the return, and the
	// thumbnail of that photo stays empty until the photo lands in it.
	const [shown, setShown] = useState<number | null>(open ? index : null)

	if (open && shown !== index) setShown(index)

	const images = useRef(new Map<number, HTMLImageElement>())

	const context: LightboxContextValue = {
		photos,
		shown,
		show: setIndex,
		register: (slot, image) => {
			images.current.set(slot, image)

			return () => {
				if (images.current.get(slot) === image) images.current.delete(slot)
			}
		},
		thumbnail: (slot) => images.current.get(slot),
		loadOf,
		record: (source, load) =>
			setLoads((prev) => (prev.has(source) ? prev : new Map(prev).set(source, load))),
	}

	// The place of the shown photo among the photos that the viewer can show.
	const position = viewable.findIndex((photo) => photo.index === shown)

	// The shown photo left `photos`, so the stage unmounts with no return. Its
	// thumbnail does not stay empty.
	if (shown !== null && position < 0) setShown(null)

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
				coverChrome
			>
				{position >= 0 && (
					<LightboxStage
						photos={viewable}
						index={position}
						onIndexChange={(next) =>
							setIndex(next === null ? null : (viewable[next]?.index ?? null))
						}
						onReturn={() => {
							// The focus goes to the thumbnail that the photo lands in. The
							// focus manager of the overlay unmounts after this, and it does
							// not move a focus that is outside the overlay.
							if (shown !== null) {
								images.current.get(shown)?.closest('button')?.focus({ preventScroll: true })
							}

							setShown(null)
						}}
						closable={closable}
						controls={controls}
						thumbnails={thumbnails}
						blur={blur}
						labels={{
							viewer: ariaLabel ?? intl.formatMessage(messages.photos),
							close: closeLabel ?? intl.formatMessage(intlMessages.close),
							previous: previousLabel ?? intl.formatMessage(messages.previous),
							next: nextLabel ?? intl.formatMessage(messages.next),
						}}
					/>
				)}
			</Overlay>
		</LightboxContext>
	)
}
