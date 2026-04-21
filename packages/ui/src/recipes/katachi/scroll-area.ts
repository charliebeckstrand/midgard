import { tv, type VariantProps } from 'tailwind-variants'
import { maru } from '../maru'
import { nagare } from '../nagare'
import { sen } from '../sen'
import { take } from '../take'

type Orientation = 'vertical' | 'horizontal' | 'both'
type Size = keyof (typeof take.scrollArea)['vertical']

const orientationKeys: Orientation[] = ['vertical', 'horizontal', 'both']
const sizeKeys = Object.keys(take.scrollArea.vertical) as Size[]

const sizeCompoundVariants = orientationKeys.flatMap((orientation) =>
	sizeKeys.map((size) => ({
		orientation,
		size,
		class: take.scrollArea[orientation][size],
	})),
)

export const scrollAreaWrapper = tv({
	base: ['group relative overflow-hidden'],
	variants: {
		rounded: {
			true: maru.rounded.lg,
			false: '',
		},
		bare: {
			true: '',
			false: [...sen.border],
		},
		orientation: {
			vertical: '',
			horizontal: '',
			both: '',
		},
		size: Object.fromEntries(sizeKeys.map((key) => [key, ''])) as Record<Size, string>,
	},
	compoundVariants: sizeCompoundVariants,
	defaultVariants: { rounded: false, bare: false, orientation: 'vertical' },
})

export const scrollAreaViewport = tv({
	base: ['[scrollbar-width:none]', '[&::-webkit-scrollbar]:hidden'],
	variants: {
		orientation: {
			vertical: 'h-full overflow-x-hidden overflow-y-auto',
			horizontal: 'w-full overflow-x-auto overflow-y-hidden',
			both: 'size-full overflow-auto',
		},
		bare: {
			true: '',
			false: 'p-4',
		},
	},
	defaultVariants: { orientation: 'vertical', bare: false },
})

export const scrollAreaScrollbar = tv({
	base: ['absolute touch-none select-none', nagare.opacity],
	variants: {
		orientation: {
			vertical: 'right-0 w-1.5',
			horizontal: 'bottom-0 h-1.5',
		},
		rounded: {
			true: '',
			false: '',
		},
		state: {
			auto: 'opacity-0 group-hover:opacity-100',
			active: 'opacity-100',
		},
	},
	compoundVariants: [
		{ orientation: 'vertical', rounded: true, class: 'top-2 bottom-2' },
		{ orientation: 'vertical', rounded: false, class: 'top-0 bottom-0' },
		{ orientation: 'horizontal', rounded: true, class: 'right-2 left-2' },
		{ orientation: 'horizontal', rounded: false, class: 'right-0 left-0' },
	],
	defaultVariants: { rounded: false },
})

export const scrollAreaThumb = tv({
	base: [
		'absolute rounded-full',
		'bg-zinc-950/20 hover:bg-zinc-950/30 active:bg-zinc-950/40',
		'dark:bg-white/20 dark:hover:bg-white/30 dark:active:bg-white/40',
	],
	variants: {
		orientation: {
			vertical: 'w-full',
			horizontal: 'h-full',
		},
	},
})

export type ScrollAreaWrapperVariants = VariantProps<typeof scrollAreaWrapper>
export type ScrollAreaViewportVariants = VariantProps<typeof scrollAreaViewport>

/** Kept for the `katachi` barrel — not consumed directly. */
export const scrollArea = {
	wrapper: scrollAreaWrapper,
	viewport: scrollAreaViewport,
	scrollbar: scrollAreaScrollbar,
	thumb: scrollAreaThumb,
}
