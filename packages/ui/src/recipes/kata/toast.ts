import { dan, sou, ugoki } from '../kiso'

const { spring, toast } = ugoki

/** The scroll of a corner stack, which takes the width of its cards. */
const corner = 'w-fit [--ui-toast-card:var(--ui-toast-width)]'

/** The scroll of a full-edge stack, which fills the viewport, as its cards do. */
const edge = 'w-full [--ui-toast-card:100%]'

/**
 * The classes of each physical `position` of the viewport, the stack in it,
 * and its cards. `Toast` resolves a `start` or `end` corner to a physical one
 * first. Each value writes the same properties, so a breakpoint replaces each
 * one (`resolveVariant`).
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

export const k = {
	viewport: [
		sou.toast,
		'fixed top-0 bottom-0 flex flex-col',
		// The stack keeps clear of the notch and the home indicator in a page with
		// `viewport-fit=cover`. Elsewhere each inset is zero, and the padding is 1rem.
		'p-4 pt-[max(--spacing(4),env(safe-area-inset-top))] pb-[max(--spacing(4),env(safe-area-inset-bottom))]',
		'pointer-events-none',
	],
	scroll: [
		'flex flex-col max-h-full overflow-y-auto overscroll-contain',
		dan.size.toast.width,
		'pointer-events-auto',
	],
	position,
	card: 'w-(--ui-toast-card)',
	motion: toast,
	/** The motion under reduced motion: the toast shows with no slide. */
	still: { top: ugoki.still(toast.top), bottom: ugoki.still(toast.bottom) },
	/** Neighbor re-pack after a dismissal: the FLIP `layout` spring the stack reflows on. */
	spring: spring.reflow,
	/**
	 * The item of each toast, padded by the gap on the side that faces the next
	 * toast. The gap steps with the density. The exit animates the padding to 0,
	 * so the neighbors slide in. The padding is a class, so the exit starts from
	 * its computed length.
	 */
	item: {
		top: [dan.gap.toast, 'pb-(--toast-gap)'],
		bottom: [dan.gap.toast, 'pt-(--toast-gap)'],
	},
}
