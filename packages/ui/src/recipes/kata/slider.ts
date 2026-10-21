import type { ScaleStep } from '../../core/density'
import { defineKata, type VariantProps } from '../../core/recipe'
import { dan, hannou, kokkaku, sen } from '../kiso'
import { scale, slider } from '../kumi/slider'

const { cursor, disabled } = hannou
const { forced } = sen

/**
 * The rings of the native thumb, in the WebKit and the Gecko form. Tailwind
 * reads only literal class names, so each pseudo-element writes its own rings.
 *
 * A ring is a box-shadow, which forced colors remove. Under forced colors the
 * slider shows the native range (`forced.control`), which paints its thumb in
 * system colors. The outline of the input marks the focus.
 */
const thumb = [
	forced.control,
	...forced.ring.outset,
	// Forced colors show the native range, so an invalid slider outlines the input there.
	...forced.invalid.outset,

	'[&::-webkit-slider-thumb]:ring-1 [&::-webkit-slider-thumb]:ring-zinc-950/20',
	'dark:[&::-webkit-slider-thumb]:ring-white/20',
	// An invalid slider rings its thumb in red, as an invalid checkbox rings its box.
	'data-invalid:[&::-webkit-slider-thumb]:ring-2',
	'data-invalid:[&::-webkit-slider-thumb]:ring-red-600',
	'focus-visible:[&::-webkit-slider-thumb]:ring-4',
	'focus-visible:[&::-webkit-slider-thumb]:ring-blue-600',
	'dark:focus-visible:[&::-webkit-slider-thumb]:ring-blue-500',

	'[&::-moz-range-thumb]:ring-1 [&::-moz-range-thumb]:ring-zinc-950/20',
	'dark:[&::-moz-range-thumb]:ring-white/20',
	'data-invalid:[&::-moz-range-thumb]:ring-2',
	'data-invalid:[&::-moz-range-thumb]:ring-red-600',
	'focus-visible:[&::-moz-range-thumb]:ring-4',
	'focus-visible:[&::-moz-range-thumb]:ring-blue-600',
	'dark:focus-visible:[&::-moz-range-thumb]:ring-blue-500',
]

export { scale }

export const k = defineKata(
	{
		extends: slider,
		slots: {
			/** The native range input. */
			base: {
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
					...thumb,

					// --slider-value is set inline (0-100%). The group sets --slider-fill from
					// the color variant, and --slider-track, which is the same for each color.
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
			},
		},
	},
	{ skeleton: kokkaku.slider },
)

/** Recipe variant props for {@link Slider}: the `color` axis of its kata, and the `size` step that the component writes as a density scope. */
export type SliderVariants = Omit<VariantProps<typeof k>, 'color'> & {
	/** The color of the filled part of the track. @defaultValue 'blue' */
	color?: VariantProps<typeof k>['color']
	size?: ScaleStep<typeof scale>
}
