import type { ScaleStep } from '../../core/density'
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
		// The rings of the thumb, and the native range and the focus outline that
		// replace them under forced colors.
		...slider.thumb,

		// --slider-value is set inline (0-100%). --slider-fill comes from the color variant,
		// and --slider-track is the same for each color.
		slider.track,
		// A native range runs from the inline start, so the fill does too.
		'[--slider-run:to_right] rtl:[--slider-run:to_left]',
		'[&::-webkit-slider-runnable-track]:w-full',
		'[&::-webkit-slider-runnable-track]:rounded-full',
		'[&::-webkit-slider-runnable-track]:bg-[linear-gradient(var(--slider-run),var(--slider-fill)_0,var(--slider-fill)_var(--slider-value,0%),var(--slider-track)_var(--slider-value,0%),var(--slider-track)_100%)]',

		'[&::-webkit-slider-thumb]:appearance-none',
		'[&::-webkit-slider-thumb]:rounded-full',
		'[&::-webkit-slider-thumb]:bg-white',
		'[&::-webkit-slider-thumb]:shadow-sm',
		'motion-safe:[&::-webkit-slider-thumb]:transition-transform',
		'hover:not-disabled:[&::-webkit-slider-thumb]:scale-110',
		'active:not-disabled:[&::-webkit-slider-thumb]:scale-110',

		'[&::-moz-range-track]:w-full',
		'[&::-moz-range-track]:rounded-full',
		'[&::-moz-range-track]:bg-[linear-gradient(var(--slider-run),var(--slider-fill)_0,var(--slider-fill)_var(--slider-value,0%),var(--slider-track)_var(--slider-value,0%),var(--slider-track)_100%)]',

		'[&::-moz-range-thumb]:rounded-full',
		'[&::-moz-range-thumb]:bg-white',
		'[&::-moz-range-thumb]:border-0',
		'[&::-moz-range-thumb]:shadow-sm',
		'motion-safe:[&::-moz-range-thumb]:transition-transform',
		'hover:not-disabled:[&::-moz-range-thumb]:scale-110',
		'active:not-disabled:[&::-moz-range-thumb]:scale-110',

		// Each size takes the step of the nearest density scope. The vertical
		// padding extends the native hit area beyond the visible thumb. A
		// pseudo-element takes the step of the input, so an explicit `size` on
		// the input also sizes the track and the thumb. The negative margin
		// centers the WebKit thumb on its track.
		dan.space.slider.y,
		dan.size.slider.input.track,
		dan.size.slider.input.thumb,
		dan.space.slider.thumb,
	],
	color,
	defaults: { color: 'blue' },
	skeleton: kokkaku.slider,
})

/** The size scale of {@link Slider}: the steps of its padding, track, and thumb. */
export const scale = slider.scale

/** Recipe variant props for {@link Slider}: the `color` axis of its kata, and the `size` step that the component writes as a density scope. */
export type SliderVariants = Omit<VariantProps<typeof k>, 'color'> & {
	/** The color of the filled part of the track. @defaultValue 'blue' */
	color?: VariantProps<typeof k>['color']
	size?: ScaleStep<typeof scale>
}
