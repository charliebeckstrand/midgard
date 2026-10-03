import { defineRecipe, type VariantProps } from '../../core/recipe'
import { sou, ugoki } from '../kiso'

const { spring, toast } = ugoki

const viewport = defineRecipe({
	base: [
		sou.toast,
		'fixed top-0 bottom-0 flex flex-col',
		'max-sm:inset-x-0 max-sm:justify-end',
		// The stack keeps clear of the notch and the home indicator in a page with
		// `viewport-fit=cover`. Elsewhere each inset is zero, and the padding is 1rem.
		'p-4 pt-[max(--spacing(4),env(safe-area-inset-top))] pb-[max(--spacing(4),env(safe-area-inset-bottom))]',
		'pointer-events-none',
	],
	position: {
		'top-right': 'justify-start right-0',
		'top-left': 'justify-start left-0',
		'bottom-right': 'justify-end right-0',
		'bottom-left': 'justify-end left-0',
	},
	defaults: { position: 'bottom-right' },
})

export const k = {
	viewport,
	scroll: [
		'flex flex-col max-h-full overflow-y-auto overscroll-contain',
		'w-fit max-sm:w-full',
		'pointer-events-auto',
	],
	card: 'w-80 max-sm:w-full',
	motion: toast,
	/** Neighbor re-pack after a dismissal: the FLIP `layout` spring the stack reflows on. */
	spring: spring.reflow,
	/** Inter-toast gap (px), animated to 0 on dismiss; neighbors slide in. */
	gap: 8,
}

/** Recipe variant props for the {@link Toast} viewport — its styling axes (`position`), for consumers composing custom slots. */
export type ToastViewportVariants = VariantProps<typeof viewport>
