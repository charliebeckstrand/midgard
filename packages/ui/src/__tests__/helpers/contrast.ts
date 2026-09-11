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

/** The two shadeless tokens, which carry their alpha the same way (`bg-white/10`). */
const NEUTRAL = /\b(white|black)(?:\/(\d{1,3}))?\b/

/** A Tailwind `/alpha` suffix as a fraction; absent means opaque. */
const alphaOf = (suffix: string | undefined): number => (suffix ? Number(suffix) / 100 : 1)

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
	// `parseColor` owns the keywords; the theme map owns the ramp. A miss in both
	// surfaces as its unparseable-colour throw.
	return parseColor(THEME.get(token) ?? token)
}

/**
 * Pull the colour token (and any `/alpha`) out of a Tailwind class, ignoring
 * its utility + state prefixes. A shade wins over `white`/`black` wherever
 * both appear, so a joined `[light, dark]` pair resolves to its shade rather
 * than to whichever token sits leftmost.
 */
function tokenOf(cls: string): { token: string; alpha: number } {
	const shade = SHADE.exec(cls)

	if (shade) return { token: `${shade[1]}-${shade[2]}`, alpha: alphaOf(shade[3]) }

	const neutral = NEUTRAL.exec(cls)

	if (neutral?.[1]) return { token: neutral[1], alpha: alphaOf(neutral[2]) }

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
