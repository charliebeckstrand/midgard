import { kasane, sen, ugoki } from '../kiso'

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
	/** The dark scrim behind the photo. It does not follow the color scheme. */
	backdrop: 'absolute inset-0 bg-zinc-950/90',
	/** The stage takes each press, so a swipe can start on any part of it. */
	stage: 'absolute inset-0 touch-none select-none',
	/** The row of slots that a swipe moves. */
	track: 'absolute inset-0',
	/**
	 * The box of one photo. A slot is the size of the stage, and a slot next to
	 * the current one sits one stage width and one gap to its side.
	 */
	slot: 'absolute inset-y-0 flex w-full items-center justify-center p-4 sm:p-16',
	/**
	 * The photo. It takes its aspect ratio from its `width` and `height`, and it
	 * shrinks to fit the slot. Its transform origin is the top left corner,
	 * which the raise math expects.
	 */
	photo: 'block h-auto max-h-full w-auto max-w-full origin-top-left bg-cover bg-center',
	/** The close button, in the top corner at the end of the line. */
	close: 'absolute end-3 top-3',
	/** The previous button, the count, and the next button, at the bottom. */
	bar: 'absolute inset-x-0 bottom-3 flex items-center justify-center gap-3',
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
