import type { ControlStep } from '../../core/density'
import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { hannou, kasane, kokkaku, ugoki } from '../kiso'
import { dan } from '../kiso/dan'
import { slider } from '../kiso/slider'

const { cursor, disabled } = hannou
const { rounded } = kasane
const { css } = ugoki
const { color } = slider

const root = defineRecipe({
	base: ['relative', 'w-full', ...cursor, 'select-none', 'touch-none', disabled, dan.space.sliderY],
	color,
	defaults: { color: 'blue' },
})

const track = defineRecipe({
	base: ['absolute left-0 right-0', rounded.full, 'bg-[var(--slider-track)]', kokkaku.slider.track],
})

const thumb = defineRecipe({
	base: [
		'absolute',
		rounded.full,
		'-translate-x-1/2',
		'bg-white',
		...mode('ring-1 ring-zinc-950/20', 'dark:ring-white/20'),
		'shadow-sm',
		css.transform,
		'hover:scale-110',
		'active:scale-110',
		'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600',
		dan.size.thumb,
	],
})

export const k = {
	root,
	track,
	fill: ['absolute', rounded.full, 'bg-[var(--slider-fill)]'],
	thumb,
} as const

/** Recipe variant props for {@link RangeSlider}: the `color` axis of its kata, and the `size` step that the component writes as a density scope. */
export type RangeSliderVariants = VariantProps<typeof root> & { size?: ControlStep }
