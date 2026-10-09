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
