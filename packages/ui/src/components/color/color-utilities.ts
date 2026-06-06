/**
 * Colour math for the picker family — pure conversions between HSVA (the
 * interactive source of truth), RGBA, and hex strings, plus the parse /
 * serialise / equality helpers the state hook leans on. Kept free of React so
 * the seam stays synchronously testable.
 */

import { clamp } from '../../utilities'
import type { ColorFormat, Hsva, Rgba } from './types'

const round = (n: number) => Math.round(n)

/** Clamp an HSVA into its canonical ranges (`h 0–360`, `s/v 0–100`, `a 0–1`) at full precision. */
export function clampHsva({ h, s, v, a }: Hsva): Hsva {
	return {
		h: clamp(h, 0, 360),
		s: clamp(s, 0, 100),
		v: clamp(v, 0, 100),
		a: clamp(a, 0, 1),
	}
}

/**
 * Clamp and round an HSVA for output / comparison — integers for `h`/`s`/`v`,
 * two decimals for `a`. Internally the picker keeps full precision so an RGB or
 * hex round-trip stays lossless and every byte value is reachable; rounding
 * happens only at these edges.
 */
function roundHsva({ h, s, v, a }: Hsva): Hsva {
	return {
		h: round(clamp(h, 0, 360)),
		s: round(clamp(s, 0, 100)),
		v: round(clamp(v, 0, 100)),
		a: round(clamp(a, 0, 1) * 100) / 100,
	}
}

/** True when two colours render identically — hue is ignored where saturation or value collapse it. */
export function equalHsva(a: Hsva, b: Hsva): boolean {
	const ca = roundHsva(a)
	const cb = roundHsva(b)

	const hueMoot = (c: Hsva) => c.s === 0 || c.v === 0

	const sameHue = hueMoot(ca) && hueMoot(cb) ? true : ca.h === cb.h

	return sameHue && ca.s === cb.s && ca.v === cb.v && Math.abs(ca.a - cb.a) < 0.005
}

export function hsvaToRgba({ h, s, v, a }: Hsva): Rgba {
	const S = clamp(s, 0, 100) / 100
	const V = clamp(v, 0, 100) / 100

	const sector = (((h % 360) + 360) % 360) / 60

	const c = V * S
	const x = c * (1 - Math.abs((sector % 2) - 1))
	const m = V - c

	let r = 0
	let g = 0
	let b = 0

	if (sector < 1) [r, g, b] = [c, x, 0]
	else if (sector < 2) [r, g, b] = [x, c, 0]
	else if (sector < 3) [r, g, b] = [0, c, x]
	else if (sector < 4) [r, g, b] = [0, x, c]
	else if (sector < 5) [r, g, b] = [x, 0, c]
	else [r, g, b] = [c, 0, x]

	return {
		r: round((r + m) * 255),
		g: round((g + m) * 255),
		b: round((b + m) * 255),
		a: clamp(a, 0, 1),
	}
}

export function rgbaToHsva({ r, g, b, a }: Rgba): Hsva {
	const R = clamp(r, 0, 255) / 255
	const G = clamp(g, 0, 255) / 255
	const B = clamp(b, 0, 255) / 255

	const max = Math.max(R, G, B)
	const min = Math.min(R, G, B)
	const d = max - min

	let h = 0

	if (d !== 0) {
		if (max === R) h = ((G - B) / d) % 6
		else if (max === G) h = (B - R) / d + 2
		else h = (R - G) / d + 4

		h *= 60

		if (h < 0) h += 360
	}

	const s = max === 0 ? 0 : d / max

	// Full precision — rounding happens at the output edges (roundHsva) so an
	// RGB round-trip through HSVA doesn't drop reachable byte values.
	return { h, s: s * 100, v: max * 100, a: clamp(a, 0, 1) }
}

const toHex2 = (n: number) => clamp(round(n), 0, 255).toString(16).padStart(2, '0')

/** Parse `#rgb`, `#rgba`, `#rrggbb`, or `#rrggbbaa` (leading `#` optional). Returns `null` for anything else. */
export function hexToRgba(input: string): Rgba | null {
	let hex = input.trim().replace(/^#/, '')

	if (/^[0-9a-f]{3,4}$/i.test(hex)) {
		hex = hex
			.split('')
			.map((c) => c + c)
			.join('')
	}

	if (!/^([0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) return null

	return {
		r: Number.parseInt(hex.slice(0, 2), 16),
		g: Number.parseInt(hex.slice(2, 4), 16),
		b: Number.parseInt(hex.slice(4, 6), 16),
		a: hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1,
	}
}

export function rgbaToHex({ r, g, b, a }: Rgba, alpha = false): string {
	const base = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`

	return alpha ? base + toHex2(clamp(a, 0, 1) * 255) : base
}

export function hsvaToHex(hsva: Hsva, alpha = false): string {
	return rgbaToHex(hsvaToRgba(hsva), alpha)
}

export function hexToHsva(input: string): Hsva | null {
	const rgba = hexToRgba(input)

	return rgba ? rgbaToHsva(rgba) : null
}

/** Lower-cased, `#`-prefixed, fixed-width hex — the form swatch equality compares against. */
export function normalizeHex(input: string, alpha = false): string | null {
	const rgba = hexToRgba(input)

	return rgba ? rgbaToHex(rgba, alpha).toLowerCase() : null
}

/** Accept either wire format and land on HSVA. Format-agnostic — a stray string still parses. */
export function toHsva(value: string | Hsva | undefined | null): Hsva | null {
	if (value == null) return null

	return typeof value === 'string' ? hexToHsva(value) : clampHsva(value)
}

/** Project the internal HSVA back onto the consumer's wire format. */
export function serializeColor(hsva: Hsva, format: ColorFormat, alpha: boolean): string | Hsva {
	if (format === 'hsva') {
		const rounded = roundHsva(hsva)

		return alpha ? rounded : { ...rounded, a: 1 }
	}

	return hsvaToHex(hsva, alpha)
}

/** Echo detection for controlled values — a string compares case-insensitively, an object by render-equality. */
export function sameColorValue(
	a: string | Hsva | undefined,
	b: string | Hsva | undefined,
): boolean {
	if (a == null || b == null) return a === b

	if (typeof a === 'string' && typeof b === 'string') return a.toLowerCase() === b.toLowerCase()

	if (typeof a !== 'string' && typeof b !== 'string') return equalHsva(a, b)

	return false
}
