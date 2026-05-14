export function clamp(val: number, lo: number, hi: number) {
	return Math.min(hi, Math.max(lo, val))
}

export function snapToStep(val: number, min: number, step: number) {
	return Math.round((val - min) / step) * step + min
}

export function pct(val: number, min: number, max: number) {
	return max === min ? 0 : ((val - min) / (max - min)) * 100
}
