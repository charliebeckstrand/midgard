import { defineRecipe, mode, type VariantProps } from '../../core/recipe'
import { hannou, kasane, type Step, ugoki } from '../kiso'
import { slider } from '../kiso/slider'

const { cursor, disabled } = hannou
const { rounded } = kasane
const { css } = ugoki
const { color } = slider

const root = defineRecipe({
	base: [
		'relative',
		'w-full',
		...cursor,
		'select-none',
		'touch-none',
		disabled,
		'density-py-[3,4,5]',
	],
	color,
	defaults: { color: 'blue' },
})

const track = defineRecipe({
	base: [
		'absolute left-0 right-0',
		rounded.full,
		'bg-[var(--slider-track)]',
		'density-h-[1,1.5,2]',
	],
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
		'density-size-[3,4,5]',
	],
})

export const k = {
	root,
	track,
	fill: ['absolute', rounded.full, 'bg-[var(--slider-fill)]'],
	thumb,
} as const

/** Recipe variant props for {@link RangeSlider}: the `color` axis of its kata, and the `size` step that the component writes as a density scope. */
export type RangeSliderVariants = VariantProps<typeof root> & { size?: Step }
