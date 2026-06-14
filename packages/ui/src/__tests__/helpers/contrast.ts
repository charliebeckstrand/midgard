/**
 * WCAG contrast helpers for the colour ramp guard.
 *
 * Reads Tailwind's `theme.css` at test time and converts each `oklch(…)` token
 * to a relative luminance. Translucent washes (the 15% soft fill) are
 * composited in sRGB space, mirroring how a browser (and axe) flattens a
 * semi-transparent layer; the contrast ratio is then computed in
 * linear-luminance space (WCAG 1.4.3).
 *
 * Calibration: `text-green-600` on white resolves to 3.21:1 (see
 * `contrast.test.ts`).
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

type RGB = [r: number, g: number, b: number]

const require = createRequire(import.meta.url)

/** `name-shade` → its `oklch(…)` string, lifted from Tailwind's theme. */
const THEME: Map<string, string> = (() => {
	const css = readFileSync(require.resolve('tailwindcss/theme.css'), 'utf8')

	const map = new Map<string, string>()

	for (const [, token, value] of css.matchAll(/--color-([a-z]+-\d{2,3}):\s*(oklch\([^;]+\))/g)) {
		if (token === undefined || value === undefined) continue

		map.set(token, value)
	}

	return map
})()

const WHITE: RGB = [1, 1, 1]
const BLACK: RGB = [0, 0, 0]

const OKLCH = /oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)/

/** oklch(…) → linear-light sRGB, gamut-clamped to [0, 1]. */
function oklchToLinear(value: string): RGB {
	const parts = OKLCH.exec(value)

	if (!parts) throw new Error(`unparseable oklch: ${value}`)

	const L = Number(parts[1]) / 100
	const C = Number(parts[2])

	const h = (Number(parts[3]) * Math.PI) / 180

	const a = C * Math.cos(h)
	const b = C * Math.sin(h)

	const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
	const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
	const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3

	const rgb: RGB = [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	]

	return rgb.map((c) => Math.min(1, Math.max(0, c))) as RGB
}

/** A `name-shade` / `white` / `black` token → linear-light sRGB. */
function linearOf(token: string): RGB {
	if (token === 'white') return WHITE
	if (token === 'black') return BLACK

	const oklch = THEME.get(token)

	if (!oklch) throw new Error(`unknown colour token: ${token}`)

	return oklchToLinear(oklch)
}

const encode = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
const decode = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)

const luminance = ([r, g, b]: RGB): number => 0.2126 * r + 0.7152 * g + 0.0722 * b

const SHADE = /(zinc|red|amber|green|blue|mist|rose|sky|teal|violet)-(\d{2,3})(?:\/(\d{1,3}))?/

/** Pull the colour token (and any `/alpha`) out of a Tailwind class, ignoring its utility + state prefixes. */
function tokenOf(cls: string): { token: string; alpha: number } {
	const shade = SHADE.exec(cls)

	if (shade)
		return { token: `${shade[1]}-${shade[2]}`, alpha: shade[3] ? Number(shade[3]) / 100 : 1 }

	if (/\bwhite\b/.test(cls)) return { token: 'white', alpha: 1 }
	if (/\bblack\b/.test(cls)) return { token: 'black', alpha: 1 }

	throw new Error(`no colour in class: ${cls}`)
}

/** The page / card surfaces a foreground sits on. */
export const SURFACE: { light: RGB; dark: RGB } = { light: WHITE, dark: linearOf('zinc-900') }

/** Composite a translucent wash class (e.g. `bg-green-600/15`) over a base surface, blending in sRGB like the browser. */
export function tinted(washClass: string, base: RGB): RGB {
	const { token, alpha } = tokenOf(washClass)

	const [wr, wg, wb] = linearOf(token).map(encode) as RGB

	const [br, bg, bb] = base.map(encode) as RGB

	const blend = (wash: number, surface: number): number =>
		decode(alpha * wash + (1 - alpha) * surface)

	return [blend(wr, br), blend(wg, bg), blend(wb, bb)]
}

/** WCAG contrast ratio of a foreground class against a (possibly tinted) surface. */
export function contrastOf(fgClass: string, surface: RGB): number {
	const fg = luminance(linearOf(tokenOf(fgClass).token))

	const bg = luminance(surface)

	const [hi, lo] = fg > bg ? [fg, bg] : [bg, fg]

	return (hi + 0.05) / (lo + 0.05)
}
