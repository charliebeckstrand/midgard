/**
 * Status kata: the semantic surface for `<StatusDot>`, now a thin skin over
 * `<Swatch shape="circle">`. Maps each `status` to its `iro.marker` currentColor
 * shade (the graphical-mark ramp, ≥3:1 on the page surface) and carries the
 * `pulse` animation. The dot geometry and the `solid` / `outline` fill come
 * from Swatch.
 */
import { defineKata } from '../../core/recipe'
import { iro, ugoki } from '../kiso'
import type { SwatchVariants } from './swatch'

const { marker } = iro
const { css } = ugoki

export const k = defineKata(
	{
		base: '',
		/** The pulse animation, applied when `pulse` is set. */
		pulse: { true: css.pulse, false: '' },
	},
	{
		/** Each status's `iro.marker` currentColor shade, fed to Swatch's `color`. */
		color: {
			inactive: marker.zinc,
			active: marker.green,
			info: marker.blue,
			warning: marker.amber,
			error: marker.red,
		},
	},
)

/** Recipe variant props for {@link StatusDot}: the semantic `status`, the `solid` / `outline` fill, Swatch's `size`, and `pulse`. */
export type StatusDotVariants = {
	/**
	 * The fill treatment, forwarded to Swatch.
	 * @defaultValue 'solid'
	 */
	variant?: Exclude<SwatchVariants['variant'], 'soft' | 'dashed'>
	/**
	 * The semantic status; sets the dot's color.
	 * @defaultValue 'inactive'
	 */
	status?: keyof typeof k.color
	/**
	 * The dot size, forwarded to Swatch. Without it, the dot takes the step of
	 * the nearest density scope.
	 */
	size?: SwatchVariants['size']
	/**
	 * Pulses the dot to draw attention.
	 * @defaultValue false
	 */
	pulse?: boolean
}
