import { defineKata } from '../../core/recipe'
import { dan, kasane, omote, sen, ugoki } from '../kiso'

const { rounded } = kasane
const { focus, ring } = sen
const { rail } = omote
const { duration, ease } = ugoki

/**
 * The move of the close button and the step bar to the next photo. It has the
 * time and the curve of `motion.step` (Motion `easeOut`).
 */
const stepTransition =
	'transition-[inset] duration-250 ease-[cubic-bezier(0,0,0.58,1)] motion-reduce:transition-none'

/**
 * The image in a thumbnail button. The image takes the radius itself. A clip of
 * the button instead leaves rough corners on the dim thumbnails.
 */
const image = 'block size-full rounded-[inherit] object-cover'

/** The timing of the flight of the photo, which the scrim fade shares. */
const raise = { duration: duration[300], ease: ease.out }

/**
 * The space around the photo, on the slots and on the layer of the controls.
 * With controls (`chrome`), the block space holds the edge, a button, and the
 * gap between the button and the photo, so a tall photo leaves room for them.
 */
const frame = {
	base: 'px-4 sm:px-16',
	chrome: { true: dan.space.lightbox.frame, false: 'py-4 sm:py-16' },
}

export const k = defineKata(
	{
		slots: {
			/**
			 * The thumbnail button. The reader presses it to raise the photo. The image
			 * fills it and takes its radius, so a size class on the button crops the
			 * photo. A thumbnail that does not load is a placeholder with the same box,
			 * and it is not `interactive`.
			 */
			trigger: {
				base: ['relative block overflow-hidden', rounded.lg],
				interactive: { true: ['cursor-zoom-in disabled:cursor-default', focus.ring], false: '' },
				slots: {
					/** The placeholder over a thumbnail that loads. */
					placeholder: 'absolute inset-0 size-full rounded-[inherit]',
					image: {
						base: image,
						/**
						 * The thumbnail of the photo that the viewer shows. The photo flies from
						 * this box and back to it, so the box stays empty while the photo is up.
						 * A thumbnail that loads is clear too, under its placeholder.
						 */
						raised: { true: 'opacity-0', false: '' },
					},
				},
			},
			/**
			 * A layer that a swipe to close fades: one holds the scrim, and one holds
			 * the controls. It has a layer of its own, so the fade paints nothing.
			 */
			dim: 'pointer-events-none absolute inset-0 will-change-[opacity]',
			/**
			 * The dark scrim behind the photo. It does not follow the color scheme. On a
			 * blurred page, it lets more of the page through.
			 */
			backdrop: {
				base: 'absolute inset-0',
				blurred: { true: 'bg-zinc-950/80', false: 'bg-zinc-950/90' },
			},
			/**
			 * The blur of the page behind the scrim, on a layer of its own under the
			 * scrim. A `backdrop-filter` sees only the paint inside the nearest ancestor
			 * with an opacity below 1. Thus the layer is not in the layer that a swipe
			 * fades. The layer fades in and out with the scrim. The blur radius does not
			 * change, because a change of radius blurs the page again in each frame.
			 */
			blur: 'pointer-events-none absolute inset-0 backdrop-blur-lg',
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
			 * the current one sits one stage width and one gap to its side. The slot
			 * clips the photo, so it is the clip of a flight (see `useLightboxFlight`).
			 * It takes the space of the `frame` around the photo.
			 */
			slot: {
				base: [
					// biome-ignore lint/plugin/no-physical-side: the flight math scales the slot from its top left corner
					'absolute inset-y-0 flex w-full origin-top-left items-center justify-center overflow-clip',
					frame.base,
				],
				chrome: frame.chrome,
			},
			/**
			 * The photo. It takes its aspect ratio from its `width` and `height`, and it
			 * shrinks to fit the slot. Its transform origin is the top left corner,
			 * which the raise math expects.
			 */
			photo:
				// biome-ignore lint/plugin/no-physical-side: the raise math scales the photo from its top left corner
				'block h-auto max-h-full w-auto max-w-full origin-top-left bg-cover bg-center will-change-transform',
			/**
			 * The layer of the controls. It is a size container with the space of a slot,
			 * so the controls can find the box of the photo from its size (see
			 * `LightboxStage`). Only the controls take a press.
			 */
			controls: {
				base: [
					'pointer-events-none absolute inset-0 @container-size *:pointer-events-auto',
					frame.base,
				],
				chrome: frame.chrome,
			},
			close: {
				closable: {
					/**
					 * The close button with `closable`: one gap above the photo, at its end. A
					 * step moves it to the next photo, with the slide (see `bar`).
					 */
					true: ['absolute end-(--lightbox-end) bottom-(--lightbox-edge)', stepTransition],
					/**
					 * The close button with no `closable`: in the top corner at the end of the
					 * line, and clear until it has the keyboard focus.
					 */
					false: 'absolute end-4 top-4 not-focus-visible:opacity-0',
				},
			},
			/**
			 * The row of the step controls, one gap below the photo. A step moves it to
			 * the next photo with the slide, and the move starts with the slide.
			 */
			bar: ['absolute inset-x-0 top-(--lightbox-edge) flex justify-center', stepTransition],
			/**
			 * The pill that holds the previous button, the count, and the next button.
			 * It does not follow the color scheme, and the buttons take its text color.
			 */
			pill: [
				'flex items-center rounded-full bg-zinc-800/80 p-1 text-zinc-100 ring-white/10',
				...ring.line[1].outset,
			],
			/**
			 * The row of thumbnails that `thumbnails` shows in place of the pill. It has
			 * the height of the pill. It is a rail, so it scrolls along the line when the
			 * thumbnails do not fit, and the edge with more thumbnails behind it fades.
			 */
			thumbnails: [
				...rail,
				'flex max-w-full gap-1 scroll-smooth p-1 motion-reduce:scroll-auto',
				'scrollbar-none [&::-webkit-scrollbar]:hidden',
			],
			thumbnail: {
				/**
				 * The button of one thumbnail. It does not follow the color scheme. A
				 * thumbnail of a photo that the viewer does not show is dim.
				 */
				base: [
					'shrink-0 cursor-pointer opacity-30 transition-opacity hover:opacity-60',
					dan.size.lightbox,
					rounded.md,
					focus.ring,
				],
				/** The thumbnail of the photo that the viewer shows. It is solid. */
				current: { true: 'opacity-100 hover:opacity-100', false: '' },
				slots: { image },
			},
			step: {
				/** A step button in the pill. */
				base: 'rounded-full',
				/**
				 * A step button at the first or the last photo. It keeps its place, so the
				 * count stays in the center, and it does not show.
				 */
				ended: { true: 'invisible', false: '' },
			},
			count: 'min-w-16 text-center text-sm tabular-nums',
		},
	},
	{
		motion: {
			/** The flight of the photo from its thumbnail to the stage, and back. */
			raise,
			/** The step from one photo to the next. */
			step: { duration: duration[250], ease: ease.out },
			/** The fade of the photo under reduced motion. */
			fade: { duration: duration[200] },
			/**
			 * The fade of the scrim and the controls. It has the timing of the flight,
			 * so the scrim is dark when the photo lands on the stage, and clear when
			 * the photo lands in its thumbnail.
			 */
			scrim: { ...ugoki.overlay, transition: raise },
		},
	},
)
