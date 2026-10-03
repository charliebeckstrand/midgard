import { defineScale, type ScaleStep } from '../../core/density'
import { defineRecipe, type VariantProps } from '../../core/recipe'
import { hannou, kokkaku } from '../kiso'
import { dan } from '../kiso/dan'
import { slider } from '../kiso/slider'

const { cursor, disabled } = hannou
const { color } = slider

export const k = defineRecipe({
	base: [
		// `block`, not the inline box of an input: an inline box sits on a line box
		// and adds the strut of the line under the track.
		'block w-full',
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
		// An invalid slider rings its thumb in red, as an invalid checkbox rings its box.
		'data-invalid:[&::-webkit-slider-thumb]:ring-2',
		'data-invalid:[&::-webkit-slider-thumb]:ring-red-600',
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
		'data-invalid:[&::-moz-range-thumb]:ring-2',
		'data-invalid:[&::-moz-range-thumb]:ring-red-600',
		'focus-visible:[&::-moz-range-thumb]:ring-4',
		'focus-visible:[&::-moz-range-thumb]:ring-blue-600',
		'dark:focus-visible:[&::-moz-range-thumb]:ring-blue-500',

		// Each size takes the step of the nearest density scope. The vertical
		// padding extends the native hit area beyond the visible thumb. A class
		// of a pseudo-element names its steps before the pseudo-element, so an
		// explicit `size` on the input also sizes the track and the thumb. The
		// negative margin centers the WebKit thumb on its track: half of the
		// track height less the thumb height.
		dan.space.sliderY,
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

/** The size scale of {@link Slider}: the steps of its padding and track. */
export const scale = defineScale(
	dan.space.sliderY,
	dan.size.sliderTrack,
	dan.space.sliderTrackY,
	dan.size.thumb,
)

/** Recipe variant props for {@link Slider}: the `color` axis of its kata, and the `size` step that the component writes as a density scope. */
export type SliderVariants = VariantProps<typeof k> & { size?: ScaleStep<typeof scale> }
