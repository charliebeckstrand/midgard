'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { PresenceContext, usePresence } from 'motion/react'
import {
	type CSSProperties,
	type KeyboardEvent,
	use,
	useEffectEvent,
	useLayoutEffect,
	useRef,
} from 'react'
import { cn } from '../../core'
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
	/** Whether the viewer shows its close button. */
	closable: boolean
	/** Whether the viewer shows the previous button, the count, and the next button. */
	controls: boolean
}

/**
 * The box of the photo in the center, for the controls. The photo shrinks to
 * fit the slot and keeps its aspect ratio, so its height is the least of its
 * own height, the height of the slot, and the width of the slot at its ratio.
 * The layer of the controls is a size container with the space of a slot, so
 * `cqw` and `cqh` give the box of the slot. The edge is one gap past the photo,
 * from the center of the layer, and the end is the end of the photo.
 */
function controlsFrame(photo: LightboxPhoto): CSSProperties {
	const ratio = `${photo.height} / ${photo.width}`

	const height = `min(${photo.height}px, 100cqh, 100cqw * ${ratio})`

	return {
		'--lightbox-edge': `calc(50% + ${height} / 2 + var(--spacing) * 4)`,
		'--lightbox-end': `calc(50% - ${height} / (${ratio}) / 2)`,
	} as CSSProperties
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
export function LightboxStage({
	index,
	onIndexChange,
	onReturn,
	labels,
	closable,
	controls,
}: LightboxStageProps) {
	const { photos, thumbnail } = useLightboxContext()

	const [isPresent, safeToRemove] = usePresence()

	// `false` when the overlay moves into its portal at rest after hydration. That
	// entrance plays nothing.
	const restore = use(PresenceContext)?.initial === false

	const photoRef = useRef<HTMLImageElement>(null)

	const trackRef = useRef<HTMLDivElement>(null)

	const flight = useLightboxFlight(photoRef)

	const close = () => onIndexChange(null)

	// The scrim and the controls, which a swipe to close fades.
	const backdropRef = useRef<HTMLDivElement>(null)

	const controlsRef = useRef<HTMLDivElement>(null)

	const stageRef = useRef<HTMLDivElement>(null)

	const track = useLightboxTrack(trackRef, {
		index,
		count: photos.length,
		onIndexChange,
		// A tap on the stage outside the photo closes the viewer.
		onTap: (event) => {
			if (!(event.target instanceof HTMLImageElement)) close()
		},
		onDismiss: close,
		dimmed: () => [backdropRef.current, controlsRef.current],
	})

	// Whether the photo is in its thumbnail, or on its way back to it. The photo
	// starts in its thumbnail, except when the viewer is restored at rest.
	const leaving = useRef(!restore)

	const followPresence = useEffectEvent((present: boolean) => {
		// The viewer opens, or opens again during the return: the photo rises.
		if (present) {
			if (leaving.current) flight.raise(thumbnail(index))

			leaving.current = false

			stageRef.current?.toggleAttribute('data-raised', false)

			for (const element of [backdropRef.current, controlsRef.current]) {
				if (element) element.style.opacity = ''
			}

			return
		}

		leaving.current = true

		track.halt()

		// The photo goes back to its thumbnail over the controls.
		stageRef.current?.toggleAttribute('data-raised', true)

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

	const bar = controls && count > 1

	// A tall photo leaves room above and below it for the controls that show.
	const frame = cn(k.frame.base, closable || bar ? k.frame.controls : k.frame.bare)

	const current = photos[index]

	const previousRef = useRef<HTMLButtonElement>(null)

	const nextRef = useRef<HTMLButtonElement>(null)

	// A step to the first or the last photo disables the button that the reader
	// pressed, and a disabled button drops the focus. The focus thus goes to the
	// other step button first, so the keyboard keeps its place in the viewer.
	const stepBy = (step: -1 | 1) => {
		const to = index + step

		if (to === 0) nextRef.current?.focus()
		else if (to === count - 1) previousRef.current?.focus()

		track.step(step)
	}

	return (
		<div
			data-slot="lightbox"
			role="dialog"
			aria-modal="true"
			aria-label={labels.viewer}
			onKeyDown={handleKeyDown}
			className="absolute inset-0"
		>
			<div ref={backdropRef} className={k.dim}>
				<m.div
					{...k.motion.scrim}
					data-slot="lightbox-backdrop"
					aria-hidden="true"
					className={k.backdrop}
				/>
			</div>
			{/* The stage takes only the pointer. Escape, the close button, and the
			    arrow keys give each of its actions to the keyboard. */}
			<div ref={stageRef} data-slot="lightbox-stage" {...track.handlers} className={k.stage}>
				<div ref={trackRef} className={k.track}>
					{slotsAround(index, photos).map(({ slot, offset, photo }) => {
						const placeholder = photo.thumbnail && photo.thumbnail !== photo.src

						return (
							<div
								key={slot}
								data-offset={offset}
								aria-hidden={offset === 0 ? undefined : true}
								inert={offset !== 0}
								className={cn(k.slot, frame)}
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
			<div ref={controlsRef} className={k.dim}>
				<m.div
					{...k.motion.scrim}
					data-slot="lightbox-controls"
					className={cn(k.controls, frame)}
					style={current && controlsFrame(current)}
				>
					{/* With no `closable`, the button shows only when it has the
					    keyboard focus, so a screen reader and a keyboard always have a
					    way out. */}
					<Button
						type="button"
						aria-label={labels.close}
						onClick={close}
						className={cn(closable ? k.close.shown : k.close.hidden)}
					>
						<Icon icon={<X />} />
					</Button>
					{bar && (
						<div className={cn(k.bar)}>
							<Button
								type="button"
								ref={previousRef}
								variant={index === 0 ? 'soft' : 'solid'}
								aria-label={labels.previous}
								disabled={index === 0}
								onClick={() => stepBy(-1)}
							>
								<Icon icon={<ChevronLeft />} className="rtl:-scale-x-100" />
							</Button>
							<span aria-live="polite" className={k.count}>
								{index + 1} / {count}
							</span>
							<Button
								type="button"
								ref={nextRef}
								variant={index === count - 1 ? 'soft' : 'solid'}
								aria-label={labels.next}
								disabled={index === count - 1}
								onClick={() => stepBy(1)}
							>
								<Icon icon={<ChevronRight />} className="rtl:-scale-x-100" />
							</Button>
						</div>
					)}
				</m.div>
			</div>
		</div>
	)
}
