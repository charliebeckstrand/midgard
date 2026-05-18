/** Map `val` to its percentage position within `[min, max]`. Returns 0 when the range is empty. */
export function pct(val: number, min: number, max: number) {
	return max === min ? 0 : ((val - min) / (max - min)) * 100
}
