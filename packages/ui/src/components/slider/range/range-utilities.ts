import { clamp } from '../../../utilities'

/**
 * Snaps `raw` to the nearest multiple of `step`, offset by `min`, and then
 * clamps it into `[min, max]`. The pointer and the keyboard hooks call it, so
 * a drag and a key resolve one value the same way.
 *
 * @remarks The order is load-bearing. The step grid can end past `max`
 * (min=2 max=10 step=3 holds 11), so a clamp before the snap can land past the
 * bound. The final rounding removes float error from the step arithmetic.
 * @internal
 */
export function snapValue(raw: number, min: number, max: number, step: number) {
	const snapped = clamp(Math.round((raw - min) / step) * step + min, min, max)

	return parseFloat(snapped.toFixed(10))
}

/**
 * Clamps both values of `range` into `[min, max]` and puts them in order. The
 * slider shows this range, and the setter moves a thumb from it, so a value
 * out of the bounds or a pair out of order does not put a thumb off the track.
 *
 * @internal
 */
export function boundRange(range: [number, number], min: number, max: number): [number, number] {
	const lo = clamp(range[0], min, max)

	const hi = clamp(range[1], min, max)

	return lo <= hi ? [lo, hi] : [hi, lo]
}
