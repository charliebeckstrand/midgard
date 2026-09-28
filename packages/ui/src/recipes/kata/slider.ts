import type { DensityStep } from '../../core/density'
import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, kokkaku } from '../kiso'
import { slider } from '../kiso/slider'

const { cursor, disabled } = hannou
const { color } = slider

export const k = defineRecipe({
	base: [
		'w-full',
		'appearance-none',
		'bg-transparent',
		...cursor,
		'outline-none',
		...disabled,

		// --slider-value is set inline (0-100%); --slider-fill / --slider-track come from the color variant.
		'[&::-webkit-slider-runnable-track]:w-full',
		'[&::-webkit-slider-runnable-track]:rounded-full',
		'[&::-webkit-slider-runnable-track]:bg-[linear-gradient(to_right,var(--slider-fill)_0,var(--slider-fill)_var(--slider-value,0%),var(--slider-track)_var(--slider-value,0%),var(--slider-track)_100%)]',

		'[&::-webkit-slider-thumb]:appearance-none',
		'[&::-webkit-slider-thumb]:rounded-full',
		'[&::-webkit-slider-thumb]:bg-white',
		'[&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-zinc-950/20',
		'dark:[&::-webkit-slider-thumb]:ring-white/20',
		'[&::-webkit-slider-thumb]:shadow-sm',
		'[&::-webkit-slider-thumb]:transition-transform',
		'hover:not-disabled:[&::-webkit-slider-thumb]:scale-110',
		'active:not-disabled:[&::-webkit-slider-thumb]:scale-110',
		'focus-visible:[&::-webkit-slider-thumb]:ring-4',
		'focus-visible:[&::-webkit-slider-thumb]:ring-blue-600',
		'dark:focus-visible:[&::-webkit-slider-thumb]:ring-blue-500',

		'[&::-moz-range-track]:w-full',
		'[&::-moz-range-track]:rounded-full',
		'[&::-moz-range-track]:bg-[linear-gradient(to_right,var(--slider-fill)_0,var(--slider-fill)_var(--slider-value,0%),var(--slider-track)_var(--slider-value,0%),var(--slider-track)_100%)]',

		'[&::-moz-range-thumb]:rounded-full',
		'[&::-moz-range-thumb]:bg-white',
		'[&::-moz-range-thumb]:border-0',
		'[&::-moz-range-thumb]:ring-1 [&::-moz-range-thumb]:ring-zinc-950/20',
		'dark:[&::-moz-range-thumb]:ring-white/20',
		'[&::-moz-range-thumb]:shadow-sm',
		'[&::-moz-range-thumb]:transition-transform',
		'hover:not-disabled:[&::-moz-range-thumb]:scale-110',
		'active:not-disabled:[&::-moz-range-thumb]:scale-110',
		'focus-visible:[&::-moz-range-thumb]:ring-4',
		'focus-visible:[&::-moz-range-thumb]:ring-blue-600',
		'dark:focus-visible:[&::-moz-range-thumb]:ring-blue-500',

		// Each size takes the step of the nearest density scope. The vertical
		// padding extends the native hit area beyond the visible thumb. A class
		// of a pseudo-element names its steps before the pseudo-element, so an
		// explicit `size` on the input also sizes the track and the thumb. The
		// negative margin centers the WebKit thumb on its track: half of the
		// track height less the thumb height.
		'density-py-[3,4,5]',
		'density-[xs,sm]:[&::-webkit-slider-runnable-track]:h-1',
		'density-md:[&::-webkit-slider-runnable-track]:h-1.5',
		'density-[lg,xl]:[&::-webkit-slider-runnable-track]:h-2',
		'density-[xs,sm]:[&::-webkit-slider-thumb]:size-3 density-[xs,sm]:[&::-webkit-slider-thumb]:-mt-1',
		'density-md:[&::-webkit-slider-thumb]:size-4 density-md:[&::-webkit-slider-thumb]:-mt-[5px]',
		'density-[lg,xl]:[&::-webkit-slider-thumb]:size-5 density-[lg,xl]:[&::-webkit-slider-thumb]:-mt-[6px]',
		'density-[xs,sm]:[&::-moz-range-track]:h-1',
		'density-md:[&::-moz-range-track]:h-1.5',
		'density-[lg,xl]:[&::-moz-range-track]:h-2',
		'density-[xs,sm]:[&::-moz-range-thumb]:size-3',
		'density-md:[&::-moz-range-thumb]:size-4',
		'density-[lg,xl]:[&::-moz-range-thumb]:size-5',
	],
	color,
	defaults: { color: 'blue' },
	skeleton: kokkaku.slider,
})

/** Recipe variant props for {@link Slider}: the `color` axis of its kata, and the `size` step that the component writes as a density scope. */
export type SliderVariants = VariantProps<typeof k> & { size?: DensityStep }
