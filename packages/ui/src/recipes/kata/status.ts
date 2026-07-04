/**
 * Status kata: the semantic surface for `<StatusDot>`, now a thin skin over
 * `<Swatch shape="circle">`. Maps each `status` to its `iro.marker` currentColor
 * shade (the graphical-mark ramp, ≥3:1 on the page surface) and carries the
 * `pulse` animation; the dot geometry and `solid`/`outline` fill come from
 * Swatch.
 */
import { iro, ugoki } from '../kiso'
import type { SwatchVariants } from './swatch'

const { marker } = iro
const { css } = ugoki

/** Each status's `iro.marker` currentColor shade, fed to Swatch's `color`. */
export const statusColor = {
	inactive: marker.zinc,
	active: marker.green,
	info: marker.blue,
	warning: marker.amber,
	error: marker.red,
} as const

/** The pulse animation, applied when `pulse` is set. */
export const pulse = css.pulse

/** Recipe variant props for {@link StatusDot} — the semantic `status`, the `solid`/`outline` fill, Swatch's `size`, and `pulse`. */
export type StatusDotVariants = {
	/**
	 * The fill treatment, forwarded to Swatch.
	 * @defaultValue 'solid'
	 */
	variant?: Exclude<SwatchVariants['variant'], 'soft'>
	/**
	 * The semantic status; sets the dot's colour.
	 * @defaultValue 'inactive'
	 */
	status?: keyof typeof statusColor
	/**
	 * The dot size, forwarded to Swatch.
	 * @defaultValue 'md'
	 */
	size?: SwatchVariants['size']
	/**
	 * Pulse the dot to draw attention.
	 * @defaultValue false
	 */
	pulse?: boolean
}
