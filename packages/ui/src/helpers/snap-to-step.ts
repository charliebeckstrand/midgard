/** Snap `val` to the nearest multiple of `step`, offset by `min`. */
export function snapToStep(val: number, min: number, step: number) {
	return Math.round((val - min) / step) * step + min
}
