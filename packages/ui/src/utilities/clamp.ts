/** Constrain `value` to the inclusive range `[lo, hi]`. */
export function clamp(value: number, lo: number, hi: number) {
	return Math.min(hi, Math.max(lo, value))
}
