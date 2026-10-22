/**
 * Toast kata: the unit of the `<Toast>` stack. The root slot `base` is the fixed
 * viewport, `scroll` is the stack in it, `item` pads each toast on its `edge`,
 * and `card` is the width of a toast. `position` is a responsive axis of the
 * viewport and the stack. The motion configs are extras.
 */
import { defineKata } from '../../core/recipe'
import { dan, sou, ugoki } from '../kiso'

const { spring, toast } = ugoki

/** The scroll of a corner stack, which takes the width of its cards. */
const corner = 'w-fit [--ui-toast-card:var(--ui-toast-width)]'

/** The scroll of a full-edge stack, which fills the viewport, as its cards do. */
const edge = 'w-full [--ui-toast-card:100%]'

/**
 * The classes of each physical `position` of the viewport and of the stack in
 * it, which also sets the width of its cards. `Toast` resolves a `start` or `end` corner to a physical one
 * first. Each value writes the same properties, so a breakpoint replaces each
 * one.
 */
const position = {
	viewport: {
		// biome-ignore-start lint/plugin/no-physical-side: each of these positions names a physical corner or edge
		'top-right': 'justify-start left-auto right-0',
		'top-left': 'justify-start left-0 right-auto',
		'bottom-right': 'justify-end left-auto right-0',
		'bottom-left': 'justify-end left-0 right-auto',
		top: 'justify-start left-0 right-0',
		bottom: 'justify-end left-0 right-0',
		// biome-ignore-end lint/plugin/no-physical-side: each of these positions names a physical corner or edge
	},
	scroll: {
		'top-right': corner,
		'top-left': corner,
		'bottom-right': corner,
		'bottom-left': corner,
		top: edge,
		bottom: edge,
	},
} as const

export const k = defineKata(
	{
		base: [
			sou.toast,
			'fixed top-0 bottom-0 flex flex-col',
			// The stack keeps clear of the notch and the home indicator in a page with
			// `viewport-fit=cover`. Elsewhere each inset is zero, and the padding is 1rem.
			'p-4 pt-[max(--spacing(4),env(safe-area-inset-top))] pb-[max(--spacing(4),env(safe-area-inset-bottom))]',
			'pointer-events-none',
		],
		responsive: { position: position.viewport },
		slots: {
			scroll: {
				base: [
					'flex flex-col max-h-full overflow-y-auto overscroll-contain',
					dan.size.toast.width,
					'pointer-events-auto',
				],
				responsive: { position: position.scroll },
			},
			/**
			 * The item of each toast, padded by the gap on the side that faces the next
			 * toast. The gap steps with the density. The exit animates the padding to 0,
			 * so the neighbors slide in. The padding is a class, so the exit starts from
			 * its computed length.
			 */
			item: {
				base: dan.gap.toast,
				edge: { top: 'pb-(--toast-gap)', bottom: 'pt-(--toast-gap)' },
			},
			card: 'w-(--ui-toast-card)',
		},
		defaults: { edge: 'top' },
	},
	{
		motion: toast,
		/** The motion under reduced motion: the toast shows with no slide. */
		still: { top: ugoki.still(toast.top), bottom: ugoki.still(toast.bottom) },
		/** Neighbor re-pack after a dismissal: the FLIP `layout` spring the stack reflows on. */
		spring: spring.reflow,
	},
)
