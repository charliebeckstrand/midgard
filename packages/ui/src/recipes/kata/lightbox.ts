import { kasane, sen, ugoki } from '../kiso'
import { dan } from '../kiso/dan'

const { rounded } = kasane
const { focus } = sen
const { duration, ease } = ugoki

export const k = {
	/**
	 * The thumbnail button. The reader presses it to raise the photo. The image
	 * fills it and takes its radius, so a size class on the button crops the
	 * photo.
	 */
	trigger: {
		base: ['block overflow-hidden cursor-zoom-in', rounded.lg, focus.ring],
		image: 'block size-full rounded-[inherit] object-cover',
		/**
		 * The thumbnail of the photo that the viewer shows. The photo flies from
		 * this box and back to it, so the box stays empty while the photo is up.
		 */
		raised: 'opacity-0',
	},
	/**
	 * A layer that a swipe to close fades: one holds the scrim, and one holds
	 * the controls. It has a layer of its own, so the fade paints nothing.
	 */
	dim: 'pointer-events-none absolute inset-0 will-change-[opacity]',
	/** The dark scrim behind the photo. It does not follow the color scheme. */
	backdrop: 'absolute inset-0 bg-zinc-950/90',
	/**
	 * The stage takes each press, so a swipe can start on any part of it. While
	 * the photo leaves its place, in a swipe to close and in the return to its
	 * thumbnail, the stage is raised above the controls, so the photo moves over
	 * them.
	 */
	stage: 'absolute inset-0 touch-none select-none data-raised:z-10',
	/**
	 * The row of slots that a swipe moves. It is a layer of its own, so a swipe
	 * moves the painted photos and does not paint them again.
	 */
	track: 'absolute inset-0 will-change-transform',
	/**
	 * The box of one photo. A slot is the size of the stage, and a slot next to
	 * the current one sits one stage width and one gap to its side.
	 */
	slot: 'absolute inset-y-0 flex w-full items-center justify-center',
	/**
	 * The space around the photo, on the slots and on the layer of the controls.
	 * With controls, the block space holds the edge, a button, and the gap
	 * between the button and the photo, so a tall photo leaves room for them.
	 */
	frame: {
		base: 'px-4 sm:px-16',
		controls: dan.space.lightbox.frame,
		bare: 'py-4 sm:py-16',
	},
	/**
	 * The photo. It takes its aspect ratio from its `width` and `height`, and it
	 * shrinks to fit the slot. Its transform origin is the top left corner,
	 * which the raise math expects.
	 */
	photo:
		'block h-auto max-h-full w-auto max-w-full origin-top-left bg-cover bg-center will-change-transform',
	/**
	 * The layer of the controls. It is a size container with the space of a slot,
	 * so the controls can find the box of the photo from its size (see
	 * `LightboxStage`). Only the controls take a press.
	 */
	controls: 'pointer-events-none absolute inset-0 @container-size *:pointer-events-auto',
	close: {
		/**
		 * The close button with `closable`: one gap above the photo, at its end. A
		 * step moves it to the next photo.
		 */
		shown: [
			'absolute end-(--lightbox-end) bottom-(--lightbox-edge)',
			'transition-[inset] duration-250 ease-out motion-reduce:transition-none',
		],
		/**
		 * The close button with no `closable`: in the top corner at the end of the
		 * line, and clear until it has the keyboard focus.
		 */
		hidden: 'absolute end-4 top-4 not-focus-visible:opacity-0',
	},
	/** The previous button, the count, and the next button, one gap below the photo. */
	bar: [
		'absolute inset-x-0 top-(--lightbox-edge) flex items-center justify-center gap-4',
		'transition-[inset] duration-250 ease-out motion-reduce:transition-none',
	],
	count: 'min-w-16 text-center text-sm text-zinc-100 tabular-nums',
	motion: {
		/** The flight of the photo from its thumbnail to the stage, and back. */
		raise: { duration: duration[300], ease: ease.out },
		/** The step from one photo to the next. */
		step: { duration: duration[250], ease: ease.out },
		/** The fade of the photo under reduced motion. */
		fade: { duration: duration[200] },
		/**
		 * The fade of the scrim and the controls. It has the timing of the flight,
		 * so the scrim is dark when the photo lands on the stage, and clear when
		 * the photo lands in its thumbnail.
		 */
		scrim: { ...ugoki.overlay, transition: { duration: duration[300], ease: ease.out } },
	},
}
