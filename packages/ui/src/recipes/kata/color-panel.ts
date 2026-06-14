import { defineRecipe, type VariantProps } from '../../core/recipe'
import { kasane, kokkaku, sen } from '../kiso'

const { rounded } = kasane
const { focus } = sen

// Draggable circular handle, centred on its inline-positioned coordinate.
const handle = [
	'absolute pointer-events-none',
	'size-4 -translate-x-1/2 -translate-y-1/2',
	rounded.full,
	'border-2 border-white shadow-sm ring-1 ring-black/25',
] as const

const area = defineRecipe({
	base: ['relative w-full cursor-crosshair touch-none', ...focus.ring],
	size: { sm: 'h-32', md: 'h-40', lg: 'h-48' },
	defaults: { size: 'md' },
})

const track = defineRecipe({
	base: ['relative w-full cursor-pointer touch-none', rounded.full, ...focus.ring],
	size: { sm: 'h-3', md: 'h-3.5', lg: 'h-4' },
	defaults: { size: 'md' },
})

const preview = defineRecipe({
	base: ['relative shrink-0 overflow-hidden', rounded.md],
	size: { sm: 'size-8', md: 'size-9', lg: 'size-10' },
	defaults: { size: 'md' },
})

export const k = defineRecipe(
	{
		base: ['flex flex-col select-none'],
		size: { sm: 'w-72 gap-2', md: 'w-80 gap-4', lg: 'w-88 gap-6' },
		defaults: { size: 'md' },
		skeleton: kokkaku.colorPanel,
	},
	{
		area: {
			base: area,
			/** White-to-transparent wash painting the saturation axis over the hue base. */
			saturation: 'absolute inset-0 [background-image:linear-gradient(to_right,#fff,transparent)]',
			/** Transparent-to-black wash painting the value axis. */
			value: 'absolute inset-0 [background-image:linear-gradient(to_top,#000,transparent)]',
		},
		track,
		preview: {
			base: preview,
			/** Preview swatch + hex field share a row beneath the sliders. */
			row: 'flex items-center gap-2',
		},
		handle,
		/** Full hue wheel laid left to right for the hue track. */
		hue: '[background-image:linear-gradient(to_right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)]',
		/** Alpha / preview chequerboard surfaced behind translucent colour. */
		checkerboard:
			'[background-image:repeating-conic-gradient(#cbd5e1_0_25%,#fff_0_50%)] [background-size:12px_12px] dark:[background-image:repeating-conic-gradient(#3f3f46_0_25%,#52525b_0_50%)]',
		/** Full-width stack for the hue (and optional alpha) tracks. */
		sliders: 'flex flex-col gap-2',
		/** Label-above-input column for one channel input. */
		field: 'flex min-w-0 flex-col gap-1',
		label: 'text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400',
		swatches: 'grid grid-cols-10 gap-1.5',
		swatch: ['aspect-square w-full cursor-pointer rounded-md', 'hover:scale-110', ...focus.ring],
	},
)

export type ColorPanelVariants = VariantProps<typeof k>
