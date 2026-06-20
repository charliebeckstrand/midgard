import { defineRecipe, type VariantProps } from '../../core/recipe'
import { ugoki } from '../kiso'

const { toast } = ugoki

const viewport = defineRecipe({
	base: [
		// `z-[100]`: toasts are the topmost layer, above app chrome and overlays.
		'fixed z-[100] top-0 bottom-0 flex flex-col',
		'max-sm:inset-x-0 max-sm:justify-end',
		'p-4',
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
	/** Inter-toast gap (px), animated to 0 on dismiss; neighbours slide in. */
	gap: 8,
}

/** Recipe variant props for the {@link Toast} viewport — its styling axes (`position`), for consumers composing custom slots. */
export type ToastViewportVariants = VariantProps<typeof viewport>
