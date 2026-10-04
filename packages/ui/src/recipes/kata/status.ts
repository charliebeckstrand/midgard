/**
 * Status kata: the semantic surface for `<StatusDot>`, now a thin skin over
 * `<Swatch shape="circle">`. Maps each `status` to its `iro.marker` currentColor
 * shade (the graphical-mark ramp, ≥3:1 on the page surface) and carries the
 * `pulse` animation. The dot geometry and the `solid` / `outline` / `dashed`
 * fill come from Swatch.
 */
import { iro, ugoki } from '../kiso'
import type { SwatchVariants } from './swatch'

const { marker } = iro
const { css } = ugoki

export const k = {
	/** Each status's `iro.marker` currentColor shade, fed to Swatch's `color`. */
	color: {
		inactive: marker.zinc,
		active: marker.green,
		info: marker.blue,
		warning: marker.amber,
		error: marker.red,
	},
	/** The pulse animation, applied when `pulse` is set. */
	pulse: css.pulse,
} as const

/** Recipe variant props for {@link StatusDot} — the semantic `status`, the `solid` / `outline` / `dashed` fill, Swatch's `size`, and `pulse`. */
export type StatusDotVariants = {
	/**
	 * The fill treatment, forwarded to Swatch.
	 * @defaultValue 'solid'
	 */
	variant?: Exclude<SwatchVariants['variant'], 'soft'>
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
	 * Pulse the dot to draw attention.
	 * @defaultValue false
	 */
	pulse?: boolean
}
