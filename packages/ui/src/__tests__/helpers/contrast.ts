/**
 * WCAG contrast helpers for the colour ramp guard.
 *
 * Reads Tailwind's `theme.css` at test time and resolves each token through
 * `utilities/contrast`, which already parses `oklch(…)` and owns the WCAG
 * maths. What lives here is what that utility does not know: the theme map, the
 * Tailwind class a guard names a colour by, and the translucent wash a surface
 * composites before anything measures it.
 *
 * Compositing runs in gamma-encoded sRGB, which mirrors how a browser (and axe)
 * flattens a semi-transparent layer.
 *
 * Calibration: `text-green-600` on white resolves to 3.21:1 (see
 * `contrast.test.ts`).
 */

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { contrastRatio, parseColor, type Srgb } from '../../utilities/contrast'

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

const SHADE = /(zinc|red|amber|green|blue|rose|violet|sky)-(\d{2,3})(?:\/(\d{1,3}))?/

/**
 * The raw `oklch(…)` string a Tailwind colour token resolves to in the theme
 * (e.g. `green-600`, `orange-600`). Lets a guard measure any token — including
 * the chart-only hues (`orange`, `sky`) outside the iro palette — with the
 * shared `contrast` utility.
 */
export function themeColor(token: string): string {
	const oklch = THEME.get(token)

	if (!oklch) throw new Error(`unknown colour token: ${token}`)

	return oklch
}

/** A `name-shade` / `white` / `black` token → gamma-encoded sRGB. */
function srgbOf(token: string): Srgb {
	return parseColor(token === 'white' || token === 'black' ? token : themeColor(token))
}

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
export const SURFACE: { light: Srgb; dark: Srgb } = {
	light: srgbOf('white'),
	dark: srgbOf('zinc-900'),
}

/** Composite a translucent wash class (e.g. `bg-green-500/15`) over a base surface, blending in sRGB like the browser. */
export function tinted(washClass: string, base: Srgb): Srgb {
	const { token, alpha } = tokenOf(washClass)

	const [wr, wg, wb] = srgbOf(token)
	const [br, bg, bb] = base

	const blend = (wash: number, surface: number): number => alpha * wash + (1 - alpha) * surface

	return [blend(wr, br), blend(wg, bg), blend(wb, bb)]
}

/** WCAG contrast ratio of a foreground class against a (possibly tinted) surface. */
export function contrastOf(fgClass: string, surface: Srgb): number {
	return contrastRatio(srgbOf(tokenOf(fgClass).token), surface)
}
