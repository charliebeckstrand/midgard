'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { PresenceContext, usePresence } from 'motion/react'
import { type KeyboardEvent, use, useEffectEvent, useLayoutEffect, useRef } from 'react'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import { k } from '../../recipes/kata/lightbox'
import { Button } from '../button'
import { Icon } from '../icon'
import { useLightboxContext } from './context'
import type { LightboxPhoto } from './types'
import { useLightboxFlight } from './use-lightbox-flight'
import { useLightboxTrack } from './use-lightbox-track'

/** The names of the viewer and of its controls. @internal */
export type LightboxLabels = {
	viewer: string
	close: string
	previous: string
	next: string
}

/** Props for {@link LightboxStage}. @internal */
export type LightboxStageProps = {
	/** The index of the photo in the center. */
	index: number
	/** Shows another photo, or closes the viewer with `null`. */
	onIndexChange: (index: number | null) => void
	/** Called when the photo lands in its thumbnail after a close. */
	onReturn: () => void
	labels: LightboxLabels
}

/** The slots of the track: the photo in the center and each photo next to it. */
function slotsAround(index: number, photos: readonly LightboxPhoto[]) {
	return [-1, 0, 1].flatMap((offset) => {
		const photo = photos[index + offset]

		return photo ? [{ slot: index + offset, offset, photo }] : []
	})
}

/**
 * The open viewer of a {@link Lightbox}: the scrim, the photos on their track,
 * and the controls. It renders inside the `Overlay` of the root, which traps
 * the focus, locks the scroll of the page, and closes on Escape.
 *
 * At mount it raises the photo from its thumbnail. When the overlay closes,
 * `AnimatePresence` holds the viewer while it puts the photo back, and the root
 * shows the thumbnail again in the frame that removes the viewer.
 *
 * A press on the stage outside the photo closes the viewer. `ArrowLeft` and
 * `ArrowRight` step through the photos in the reading order, and so does a
 * swipe.
 *
 * @internal
 */
export function LightboxStage({ index, onIndexChange, onReturn, labels }: LightboxStageProps) {
	const { photos, thumbnail } = useLightboxContext()

	const [isPresent, safeToRemove] = usePresence()

	// `false` when the overlay moves into its portal at rest after hydration. That
	// entrance plays nothing.
	const restore = use(PresenceContext)?.initial === false

	const photoRef = useRef<HTMLImageElement>(null)

	const trackRef = useRef<HTMLDivElement>(null)

	const flight = useLightboxFlight(photoRef)

	const close = () => onIndexChange(null)

	const track = useLightboxTrack(trackRef, {
		index,
		count: photos.length,
		onIndexChange,
		// A tap on the stage outside the photo closes the viewer.
		onTap: (event) => {
			if (!(event.target instanceof HTMLImageElement)) close()
		},
	})

	// Whether the photo is in its thumbnail, or on its way back to it. The photo
	// starts in its thumbnail, except when the viewer is restored at rest.
	const leaving = useRef(!restore)

	const followPresence = useEffectEvent((present: boolean) => {
		// The viewer opens, or opens again during the return: the photo rises.
		if (present) {
			if (leaving.current) flight.raise(thumbnail(index))

			leaving.current = false

			return
		}

		leaving.current = true

		track.halt()

		flight.lower(thumbnail(index)).then(() => {
			if (!leaving.current) return

			onReturn()

			safeToRemove?.()
		})
	})

	useLayoutEffect(() => {
		followPresence(isPresent)
	}, [isPresent])

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		const key = logicalArrowKey(event.key, event.currentTarget)

		if (key !== 'ArrowLeft' && key !== 'ArrowRight') return

		event.preventDefault()

		track.step(key === 'ArrowRight' ? 1 : -1)
	}

	const count = photos.length

	return (
		<div
			data-slot="lightbox"
			role="dialog"
			aria-modal="true"
			aria-label={labels.viewer}
			onKeyDown={handleKeyDown}
			className="absolute inset-0"
		>
			<m.div
				{...k.motion.scrim}
				data-slot="lightbox-backdrop"
				aria-hidden="true"
				className={k.backdrop}
			/>
			{/* The stage takes only the pointer. Escape, the close button, and the
			    arrow keys give each of its actions to the keyboard. */}
			<div data-slot="lightbox-stage" {...track.handlers} className={k.stage}>
				<div ref={trackRef} className={k.track}>
					{slotsAround(index, photos).map(({ slot, offset, photo }) => {
						const placeholder = photo.thumbnail && photo.thumbnail !== photo.src

						return (
							<div
								key={slot}
								data-offset={offset}
								aria-hidden={offset === 0 ? undefined : true}
								inert={offset !== 0}
								className={k.slot}
								// One slot width and one gap for each place from the center.
								style={{ insetInlineStart: `calc(${offset} * (100% + var(--spacing) * 4))` }}
							>
								<img
									ref={offset === 0 ? photoRef : undefined}
									data-slot="lightbox-photo"
									src={photo.src}
									alt={photo.alt}
									width={photo.width}
									height={photo.height}
									draggable={false}
									className={k.photo}
									// The thumbnail is in the cache, so it paints at once under the photo.
									style={placeholder ? { backgroundImage: `url("${photo.thumbnail}")` } : undefined}
								/>
							</div>
						)
					})}
				</div>
			</div>
			<m.div {...k.motion.scrim} className="contents">
				<Button
					type="button"
					variant="soft"
					aria-label={labels.close}
					onClick={close}
					className={k.close}
				>
					<Icon icon={<X />} />
				</Button>
				{count > 1 && (
					<div className={k.bar}>
						<Button
							type="button"
							variant="soft"
							aria-label={labels.previous}
							disabled={index === 0}
							onClick={() => track.step(-1)}
						>
							<Icon icon={<ChevronLeft />} className="rtl:-scale-x-100" />
						</Button>
						<span aria-live="polite" className={k.count}>
							{index + 1} / {count}
						</span>
						<Button
							type="button"
							variant="soft"
							aria-label={labels.next}
							disabled={index === count - 1}
							onClick={() => track.step(1)}
						>
							<Icon icon={<ChevronRight />} className="rtl:-scale-x-100" />
						</Button>
					</div>
				)}
			</m.div>
		</div>
	)
}
