'use client'

import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { PresenceContext, useComposedRefs, usePresence } from 'motion/react'
import {
	type CSSProperties,
	type KeyboardEvent,
	use,
	useEffectEvent,
	useLayoutEffect,
	useRef,
	useState,
} from 'react'
import { cn } from '../../core'
import { logicalArrowKey } from '../../hooks/a11y/logical-arrow'
import { scrollNodeWithin } from '../../hooks/use-scroll-within'
import * as m from '../../primitives/reduced-motion/reduced-motion-elements'
import { k } from '../../recipes/kata/lightbox'
import { hasBrowserModifier } from '../../utilities/modifier-keys'
import { Button } from '../button'
import { Icon } from '../icon'
import { useLightboxContext } from './context'
import { PAN_KEY_STEP, thumbnailOf, ZOOM_KEY_STEP } from './lightbox-utilities'
import type { LightboxViewPhoto } from './types'
import { useLightboxFlight } from './use-lightbox-flight'
import { useLightboxTrack } from './use-lightbox-track'
import type { LightboxZoom } from './use-lightbox-zoom'

/** The names of the viewer and of its controls. @internal */
export type LightboxLabels = {
	viewer: string
	close: string
	previous: string
	next: string
}

/** Props for {@link LightboxStage}. @internal */
export type LightboxStageProps = {
	/** The photos that the viewer can show. */
	photos: readonly LightboxViewPhoto[]
	/** The place of the photo in the center, in `photos`. */
	index: number
	/** Shows the photo at another place in `photos`, or closes the viewer with `null`. */
	onIndexChange: (index: number | null) => void
	/** Called when the photo lands in its thumbnail after a close. */
	onReturn: () => void
	labels: LightboxLabels
	/** Whether the viewer shows its close button. */
	closable: boolean
	/** Whether the viewer shows the previous button, the count, and the next button. */
	controls: boolean
	/** Whether the controls show a row of thumbnails in place of the pill. */
	thumbnails: boolean
	/** Whether the page behind the scrim is blurred. */
	blur: boolean
}

/** The keys that zoom the photo, by the factor of each. */
const ZOOM_KEYS: Readonly<Record<string, number>> = {
	'+': ZOOM_KEY_STEP,
	'=': ZOOM_KEY_STEP,
	'-': 1 / ZOOM_KEY_STEP,
}

/** The arrow keys that pan a zoomed photo, by the direction that each moves the photo. */
const PAN_KEYS: Readonly<Record<string, readonly [number, number]>> = {
	ArrowLeft: [1, 0],
	ArrowRight: [-1, 0],
	ArrowUp: [0, 1],
	ArrowDown: [0, -1],
}

/**
 * Zooms or pans the photo for a key press, and tells whether the key did. `+`
 * and `-` zoom about the center of the stage, and `0` takes the photo back to
 * rest. An arrow key pans a zoomed photo toward the part on its side.
 */
function zoomByKey(key: string, zoom: LightboxZoom, stage: HTMLElement | null): boolean {
	const factor = ZOOM_KEYS[key]

	if (factor) {
		zoom.zoomBy(factor)

		return true
	}

	if (key === '0') {
		zoom.reset()

		return true
	}

	const pan = PAN_KEYS[key]

	if (!pan || !stage || !zoom.zoomed()) return false

	zoom.move(pan[0] * PAN_KEY_STEP * stage.clientWidth, pan[1] * PAN_KEY_STEP * stage.clientHeight)

	return true
}

/**
 * The box of the photo in the center, for the controls. The photo shrinks to
 * fit the slot and keeps its aspect ratio, so its height is the least of its
 * own height, the height of the slot, and the width of the slot at its ratio.
 * The layer of the controls is a size container with the space of a slot, so
 * `cqw` and `cqh` give the box of the slot. The edge is one gap past the photo,
 * from the center of the layer, and the end is the end of the photo.
 */
function controlsFrame(photo: LightboxViewPhoto): CSSProperties {
	const ratio = `${photo.height} / ${photo.width}`

	const height = `min(${photo.height}px, 100cqh, 100cqw * ${ratio})`

	return {
		'--lightbox-edge': `calc(50% + ${height} / 2 + var(--spacing) * 4)`,
		'--lightbox-end': `calc(50% - ${height} / (${ratio}) / 2)`,
	} as CSSProperties
}

/**
 * Puts the current thumbnail in the center of the row at once. It is the ref
 * callback of the row: React attaches a ref in the commit, before the browser
 * paints, so the row paints with the current thumbnail in view. React gives
 * `null` on detach.
 */
function centerCurrentThumbnail(row: HTMLDivElement | null) {
	const current = row?.querySelector<HTMLElement>('[aria-current]')

	if (row && current) scrollNodeWithin(row, current, { inline: 'center', behavior: 'instant' })
}

/** The slots of the track: the photo in the center and each photo next to it. */
function slotsAround(index: number, photos: readonly LightboxViewPhoto[]) {
	return [-1, 0, 1].flatMap((offset) => {
		const photo = photos[index + offset]

		return photo ? [{ offset, photo }] : []
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
 * swipe. The keys also zoom the photo (see `zoomByKey`), and while the photo
 * is zoomed, the arrow keys pan it and do not step.
 *
 * @internal
 */
export function LightboxStage({
	photos,
	index,
	onIndexChange,
	onReturn,
	labels,
	closable,
	controls,
	thumbnails,
	blur,
}: LightboxStageProps) {
	const { thumbnail } = useLightboxContext()

	// The thumbnail of the photo in the center, where it rises from and goes back to.
	const home = () => thumbnail(photos[index]?.index ?? -1)

	const [isPresent, safeToRemove] = usePresence()

	// `false` when the overlay moves into its portal at rest after hydration. That
	// entrance plays nothing.
	const restore = use(PresenceContext)?.initial === false

	const photoRef = useRef<HTMLImageElement>(null)

	const trackRef = useRef<HTMLDivElement>(null)

	const flight = useLightboxFlight(photoRef)

	const handleClose = () => onIndexChange(null)

	// The scrim and the controls, which a swipe to close fades.
	const backdropRef = useRef<HTMLDivElement>(null)

	const controlsRef = useRef<HTMLDivElement>(null)

	const stageRef = useRef<HTMLDivElement>(null)

	// The photo that a slide ends on, while the slide runs from the photo
	// `from`. Each is a `photo.index`, not a place in `photos`: a load or a
	// failure of a thumbnail moves the places during a slide. The controls show
	// the photo `to` from the start of the slide (see `at`). The aim ends when
	// the slide lands, so a later change of `index` back to the photo `from`
	// does not show the photo `to` again.
	const [aim, setAim] = useState<{ from: number; to: number } | null>(null)

	const track = useLightboxTrack(trackRef, {
		index,
		count: photos.length,
		onIndexChange: (to) => {
			setAim(null)

			onIndexChange(to)
		},
		onAim: (to) => {
			const from = photos[index]?.index

			const target = photos[to]?.index

			setAim(from === undefined || target === undefined ? null : { from, to: target })
		},
		// A tap on the stage outside the photo closes the viewer.
		onTap: (event) => {
			if (!(event.target instanceof HTMLImageElement)) handleClose()
		},
		onDismiss: handleClose,
		dimmed: () => [backdropRef.current, controlsRef.current],
	})

	// Whether the photo is in its thumbnail, or on its way back to it. The photo
	// starts in its thumbnail, except when the viewer is restored at rest.
	const leaving = useRef(!restore)

	const followPresence = useEffectEvent((present: boolean) => {
		// The viewer opens, or opens again during the return: the photo rises. A
		// reopen stops the return, and the controls show the photo in the center.
		// A close can stop a step or a swipe midway, so the track slides back to
		// rest as the photo rises.
		if (present) {
			if (leaving.current) {
				setAim(null)

				// The raise takes the photo to rest, so the zoom only drops its state.
				track.zoom.clear(false)

				flight.raise(home())

				track.settle()
			}

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

		flight.lower(home()).then(() => {
			if (!leaving.current) return

			onReturn()

			safeToRemove?.()
		})
	})

	useLayoutEffect(() => {
		followPresence(isPresent)
	}, [isPresent])

	// A zoom is for one photo. When another photo comes to the center outside a
	// step, as a slide lands or a controlled index changes, the zoom goes back
	// to rest. A shift of the places in `photos` keeps `photo.index`, and so
	// keeps the zoom.
	const center = photos[index]?.index

	const shownCenter = useRef(center)

	const clearZoom = useEffectEvent(() => track.zoom.clear(true))

	useLayoutEffect(() => {
		if (shownCenter.current === center) return

		shownCenter.current = center

		clearZoom()
	}, [center])

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		// A key with a modifier is for the browser, such as its own zoom.
		if (hasBrowserModifier(event)) return

		if (zoomByKey(event.key, track.zoom, stageRef.current)) {
			event.preventDefault()

			return
		}

		const key = logicalArrowKey(event.key, event.currentTarget)

		if (key !== 'ArrowLeft' && key !== 'ArrowRight') return

		event.preventDefault()

		track.step(key === 'ArrowRight' ? 1 : -1)
	}

	const count = photos.length

	const bar = controls && count > 1

	// A tall photo leaves room above and below it for the controls that show.
	const frame = cn(k.frame.base, closable || bar ? k.frame.controls : k.frame.bare)

	// The place of the photo that the controls show. The photos follow `index`,
	// the photo in the center slot, which changes when a slide lands. Each
	// control follows the photo that the viewer goes to instead, so it changes
	// when the slide starts and moves with it. A slide that lands changes
	// `index` and ends its aim in the same commit.
	const aimedAt =
		aim && photos[index]?.index === aim.from
			? photos.findIndex((photo) => photo.index === aim.to)
			: -1

	// When the photo `to` is not in `photos`, the controls show the photo in the center.
	const at = aimedAt === -1 ? index : aimedAt

	const aimed = photos[at]

	const previousRef = useRef<HTMLButtonElement>(null)

	const nextRef = useRef<HTMLButtonElement>(null)

	// A step to the first or the last photo disables the button that the reader
	// pressed, and a disabled button drops the focus. The focus thus goes to the
	// other step button first, so the keyboard keeps its place in the viewer.
	const stepBy = (step: -1 | 1) => {
		const to = at + step

		if (to === 0) nextRef.current?.focus()
		else if (to === count - 1) previousRef.current?.focus()

		track.step(step)
	}

	const rowRef = useRef<HTMLDivElement>(null)

	const setRow = useComposedRefs(rowRef, centerCurrentThumbnail)

	// The thumbnail of the photo that the controls show stays in the center of
	// the row, and the row scrolls to it with its own `scroll-behavior`. When the
	// focus is in the row, it goes to that thumbnail, so the arrow keys move the
	// focus with the photo.
	useLayoutEffect(() => {
		const row = rowRef.current

		const current = row?.children[at]

		if (!row || !(current instanceof HTMLElement)) return

		if (row.contains(document.activeElement)) current.focus({ preventScroll: true })

		scrollNodeWithin(row, current, { inline: 'center' })
	}, [at])

	// A press on the stage, the photo, or the scrim has no focusable target, so
	// the browser moves the focus to `<body>`, and the arrow keys stop. The viewer
	// takes the focus of such a press instead. `tabIndex={-1}` keeps it out of the
	// tab order.
	return (
		<div
			data-slot="lightbox"
			role="dialog"
			aria-modal="true"
			aria-label={labels.viewer}
			tabIndex={-1}
			onKeyDown={handleKeyDown}
			className="absolute inset-0 outline-hidden"
		>
			{blur && (
				<m.div
					{...k.motion.scrim}
					data-slot="lightbox-blur"
					aria-hidden="true"
					className={k.blur}
				/>
			)}
			<div ref={backdropRef} className={k.dim}>
				<m.div
					{...k.motion.scrim}
					data-slot="lightbox-backdrop"
					aria-hidden="true"
					className={blur ? k.backdrop.blurred : k.backdrop.base}
				/>
			</div>
			{/* The stage takes only the pointer. Escape, the close button, and the
			    arrow keys give each of its actions to the keyboard. */}
			<div ref={stageRef} data-slot="lightbox-stage" {...track.handlers} className={k.stage}>
				<div ref={trackRef} className={k.track}>
					{slotsAround(index, photos).map(({ offset, photo }) => {
						const placeholder = photo.thumbnail && photo.thumbnail !== photo.src

						return (
							// The key is the photo, not its place. A load or a failure of a
							// thumbnail moves the places, and the photo in the center must
							// keep its element.
							<div
								key={photo.index}
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
					style={aimed && controlsFrame(aimed)}
				>
					{/* With no `closable`, the button shows only when it has the
					    keyboard focus, so a screen reader and a keyboard always have a
					    way out. */}
					<Button
						// The controls of the stage write no field, so a locked scope, such as a
						// submitting form, leaves them live.
						lockable={false}
						type="button"
						aria-label={labels.close}
						onClick={handleClose}
						className={cn(closable ? k.close.shown : k.close.hidden)}
					>
						<Icon icon={<X />} />
					</Button>
					{bar && (
						<div className={cn(k.bar)}>
							{thumbnails ? (
								<div ref={setRow} className={cn(k.thumbnails)}>
									{photos.map((photo, place) => (
										<button
											key={photo.index}
											type="button"
											aria-current={place === at ? 'true' : undefined}
											// One tab stop: the arrow keys move the focus along the row.
											tabIndex={place === at ? 0 : -1}
											className={cn(k.thumbnail.base, place === at && k.thumbnail.current)}
											onClick={() => track.go(place)}
										>
											<img
												src={thumbnailOf(photo)}
												alt={photo.alt}
												draggable={false}
												decoding="async"
												className={k.thumbnail.image}
											/>
										</button>
									))}
								</div>
							) : (
								<div className={cn(k.pill)}>
									<Button
										lockable={false}
										type="button"
										ref={previousRef}
										variant="plain"
										color="inherit"
										className={cn(k.step, at === 0 && k.ended)}
										aria-label={labels.previous}
										disabled={at === 0}
										onClick={() => stepBy(-1)}
									>
										<Icon icon={<ChevronLeft />} className="rtl:-scale-x-100" />
									</Button>
									<span aria-hidden="true" className={k.count}>
										{at + 1} / {count}
									</span>
									<Button
										lockable={false}
										type="button"
										ref={nextRef}
										variant="plain"
										color="inherit"
										className={cn(k.step, at === count - 1 && k.ended)}
										aria-label={labels.next}
										disabled={at === count - 1}
										onClick={() => stepBy(1)}
									>
										<Icon icon={<ChevronRight />} className="rtl:-scale-x-100" />
									</Button>
								</div>
							)}
						</div>
					)}
				</m.div>
			</div>
			{/* A step names the photo and its place, with or without the bar. */}
			<span aria-live="polite" className="sr-only">
				{[aimed?.alt, `${at + 1} / ${count}`].filter(Boolean).join(', ')}
			</span>
		</div>
	)
}
