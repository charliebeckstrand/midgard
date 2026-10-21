import type { ScaleStep } from '../../core/density'
import { defineKata, mode, type VariantProps } from '../../core/recipe'
import { dan, hannou, kasane, kokkaku, sen, ugoki } from '../kiso'
import { scale, slider } from '../kumi/slider'

const { cursor, disabled } = hannou
const { rounded } = kasane
const { css } = ugoki
const { forced, ring } = sen

export { scale }

export const k = defineKata({
	extends: slider,
	slots: {
		/** The box that holds the track, the fill, and the thumbs. */
		base: {
			base: [
				'relative',
				'w-full',
				...cursor,
				'select-none',
				'touch-none',
				disabled,
				dan.space.slider.y,
			],
		},
		track: {
			base: [
				'absolute inset-x-0',
				rounded.full,
				'bg-(--slider-track)',
				forced.outline,
				kokkaku.slider.track,
			],
		},
		fill: { base: ['absolute', rounded.full, 'bg-(--slider-fill)', forced.mark] },
		thumb: {
			base: [
				'absolute',
				rounded.full,
				'-translate-x-1/2',
				// The thumb sits at `inset-inline-start`, so its center offset mirrors in a right-to-left layout.
				'rtl:translate-x-1/2',
				'bg-white',
				...ring.line[1].outset,
				...mode('ring-zinc-950/20', 'dark:ring-white/20'),
				'shadow-sm',
				forced.mark,
				css.transform,
				'hover:not-disabled:scale-110',
				'active:not-disabled:scale-110',
				// The thumb rings match the native thumb of `Slider` (`kata/slider.ts`).
				// Tailwind needs literal pseudo-element classes there, so the two lists stay apart.
				'data-invalid:ring-2 data-invalid:ring-red-600',
				...forced.invalid.outset,
				'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600',
				'dark:focus-visible:ring-blue-500',
				...forced.ring.outset,
				dan.size.thumb.base,
			],
		},
	},
})

/** Recipe variant props for {@link RangeSlider}: the `color` axis of its kata, and the `size` step that the component writes as a density scope. */
export type RangeSliderVariants = Omit<VariantProps<typeof k>, 'color'> & {
	/** The color of the filled part of the track. @defaultValue 'blue' */
	color?: VariantProps<typeof k>['color']
	size?: ScaleStep<typeof scale>
}
