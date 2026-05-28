import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import type { ScrollOrientation } from '../../types'
import { kasane, sen, shaku, ugoki } from '../kiso'

type Orientation = ScrollOrientation
type Size = keyof (typeof shaku.scrollArea)['vertical']

const orientations: Orientation[] = ['vertical', 'horizontal', 'both']
const sizes = Object.keys(shaku.scrollArea.vertical) as Size[]

const compound = orientations.flatMap((orientation) =>
	sizes.map((size) => ({
		orientation,
		size,
		class: shaku.scrollArea[orientation][size],
	})),
)

const wrapper = defineRecipe({
	base: ['group relative overflow-hidden'],
	rounded: {
		true: kasane.rounded.lg,
		false: '',
	},
	bare: {
		true: '',
		false: [...sen.border.default],
	},
	orientation: {
		vertical: '',
		horizontal: '',
		both: '',
	},
	size: Object.fromEntries(sizes.map((key) => [key, ''])) as Record<Size, string>,
	compound,
	defaults: { rounded: false, bare: false, orientation: 'vertical' },
})

const viewport = defineRecipe({
	base: ['[scrollbar-width:none]', '[&::-webkit-scrollbar]:hidden'],
	orientation: {
		vertical: 'h-full overflow-x-hidden overflow-y-auto',
		horizontal: 'w-full overflow-x-auto overflow-y-hidden',
		both: 'size-full overflow-auto',
	},
	bare: {
		true: '',
		false: 'p-4',
	},
	defaults: { orientation: 'vertical', bare: false },
})

const scrollbar = defineRecipe({
	base: ['absolute touch-none select-none', ugoki.css.opacity, ugoki.css.duration],
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
	compound: [
		{ orientation: 'vertical', rounded: 'true', class: 'top-2 bottom-2' },
		{ orientation: 'vertical', rounded: 'false', class: 'top-0 bottom-0' },
		{ orientation: 'horizontal', rounded: 'true', class: 'right-2 left-2' },
		{ orientation: 'horizontal', rounded: 'false', class: 'right-0 left-0' },
	],
	defaults: { rounded: false },
})

const thumb = defineRecipe({
	base: [
		'absolute',
		kasane.rounded.full,
		...mode(
			'bg-zinc-950/20 hover:bg-zinc-950/30 active:bg-zinc-950/40',
			'dark:bg-white/20 dark:hover:bg-white/30 dark:active:bg-white/40',
		),
	],
	orientation: {
		vertical: 'w-full',
		horizontal: 'h-full',
	},
})

export const k = {
	wrapper,
	viewport,
	scrollbar,
	thumb,
} as const

export type ScrollAreaWrapperVariants = VariantProps<typeof wrapper>
export type ScrollAreaViewportVariants = VariantProps<typeof viewport>
