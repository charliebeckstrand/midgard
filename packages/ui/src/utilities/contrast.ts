/**
 * WCAG contrast utilities: measure the accessibility contrast between two
 * colours and pick a readable ink.
 *
 * The maths is WCAG 2.1 (1.4.3): a colour's relative luminance from its
 * gamma-decoded sRGB channels, then the `(L₁ + 0.05) / (L₂ + 0.05)` ratio of
 * the lighter over the darker. Inputs parse from the forms the design system
 * writes — `#rrggbb`, `rgb(…)`, and the OKLCH the Tailwind theme is authored in
 * (`oklch(…)`) — or an {@link Srgb} triple.
 *
 * Colours are treated as opaque: an alpha channel is ignored, so composite a
 * translucent wash over its surface before measuring it.
 */

/** An sRGB colour as three gamma-encoded channels in `[0, 1]` — the space CSS colours live in. */
export type Srgb = readonly [r: number, g: number, b: number]

/**
 * A colour to measure: a CSS string (`#rgb` / `#rrggbb`, `rgb(…)`, `oklch(…)`,
 * or the keywords `white` / `black`) or an {@link Srgb} triple.
 */
export type ColorInput = string | Srgb

/** WCAG 1.4.3 minimum contrast for normal text (AA). */
export const WCAG_AA_TEXT = 4.5

/** WCAG 1.4.3 minimum contrast for large text (AA). */
export const WCAG_AA_LARGE = 3

/** WCAG 1.4.11 minimum contrast for non-text UI components and graphical objects. */
export const WCAG_NON_TEXT = 3

/** WCAG 1.4.6 minimum contrast for normal text (AAA). */
export const WCAG_AAA_TEXT = 7

/** WCAG 1.4.6 minimum contrast for large text (AAA). */
export const WCAG_AAA_LARGE = 4.5

/**
 * A named WCAG conformance floor. `AA` / `AAA` are the normal-text minimums
 * (1.4.3 / 1.4.6); the `-large` variants the large-text minimums (14pt bold or
 * 18pt-plus); `non-text` the 3:1 floor for UI components and graphical objects
 * (1.4.11).
 */
export type ContrastLevel = 'AA' | 'AA-large' | 'AAA' | 'AAA-large' | 'non-text'

/** A contrast threshold: a named {@link ContrastLevel} or a raw ratio. */
export type ContrastThreshold = number | ContrastLevel

const LEVEL_FLOOR: Record<ContrastLevel, number> = {
	AA: WCAG_AA_TEXT,
	'AA-large': WCAG_AA_LARGE,
	AAA: WCAG_AAA_TEXT,
	'AAA-large': WCAG_AAA_LARGE,
	'non-text': WCAG_NON_TEXT,
}

/** Resolve a {@link ContrastThreshold} to its ratio: a named level to its floor, a number as-is. */
export function contrastFloor(threshold: ContrastThreshold): number {
	return typeof threshold === 'number' ? threshold : LEVEL_FLOOR[threshold]
}

const clamp01 = (channel: number): number => Math.min(1, Math.max(0, channel))

/** Gamma-encode a linear-light channel to sRGB. */
const encodeGamma = (channel: number): number =>
	channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055

/** Gamma-decode an sRGB channel to linear light. */
const decodeGamma = (channel: number): number =>
	channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4

/** Split the inside of a `fn(a b c / d)` colour into its component tokens. */
function fields(inside: string): string[] {
	return inside.split(/[\s,/]+/).filter(Boolean)
}

/** Parse `#rgb` / `#rgba` / `#rrggbb` / `#rrggbbaa`; alpha is dropped. */
function parseHex(css: string): Srgb | null {
	const digits = /^#([0-9a-f]{3,8})$/i.exec(css)?.[1]

	if (digits === undefined) return null

	const hex =
		digits.length === 3 || digits.length === 4
			? [...digits].map((digit) => digit + digit).join('')
			: digits

	if (hex.length !== 6 && hex.length !== 8) return null

	const channel = (at: number): number => Number.parseInt(hex.slice(at, at + 2), 16) / 255

	return [channel(0), channel(2), channel(4)]
}

/** Parse `rgb(…)` / `rgba(…)` with either `0–255` or `%` channels; alpha is dropped. */
function parseRgb(css: string): Srgb | null {
	const inside = /^rgba?\(([^)]+)\)$/i.exec(css)?.[1]

	if (inside === undefined) return null

	const [rp, gp, bp] = fields(inside)

	if (rp === undefined || gp === undefined || bp === undefined) return null

	const channel = (part: string): number =>
		part.endsWith('%') ? Number(part.slice(0, -1)) / 100 : Number(part) / 255

	const r = channel(rp)
	const g = channel(gp)
	const b = channel(bp)

	if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null

	return [clamp01(r), clamp01(g), clamp01(b)]
}

/** Convert OKLCH lightness / chroma / hue-degrees to gamut-clamped sRGB. */
function oklchToSrgb(lightness: number, chroma: number, hueDegrees: number): Srgb {
	const hue = (hueDegrees * Math.PI) / 180

	const a = chroma * Math.cos(hue)
	const b = chroma * Math.sin(hue)

	const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
	const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
	const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3

	const linear: [number, number, number] = [
		4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
		-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
		-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
	]

	return [
		encodeGamma(clamp01(linear[0])),
		encodeGamma(clamp01(linear[1])),
		encodeGamma(clamp01(linear[2])),
	]
}

/** Parse `oklch(…)`; lightness reads `0–1` or `%`, hue reads plain or `deg`; alpha is dropped. */
function parseOklch(css: string): Srgb | null {
	const inside = /^oklch\(([^)]+)\)$/i.exec(css)?.[1]

	if (inside === undefined) return null

	const [lp, cp, hp] = fields(inside)

	if (lp === undefined || cp === undefined || hp === undefined) return null

	const lightness = lp.endsWith('%') ? Number(lp.slice(0, -1)) / 100 : Number(lp)
	const chroma = Number(cp)
	const hue = Number(hp.replace(/deg$/i, ''))

	return [lightness, chroma, hue].every(Number.isFinite)
		? oklchToSrgb(lightness, chroma, hue)
		: null
}

/**
 * Resolve a {@link ColorInput} to gamma-encoded {@link Srgb}.
 *
 * @throws If a string can't be parsed as a supported colour form.
 */
export function parseColor(color: ColorInput): Srgb {
	if (typeof color !== 'string') return [clamp01(color[0]), clamp01(color[1]), clamp01(color[2])]

	const css = color.trim().toLowerCase()

	if (css === 'white') return [1, 1, 1]
	if (css === 'black') return [0, 0, 0]

	const parsed = parseHex(css) ?? parseRgb(css) ?? parseOklch(css)

	if (!parsed) throw new Error(`unparseable colour: ${color}`)

	return parsed
}

/** The WCAG relative luminance of a colour, in `[0, 1]`. */
export function relativeLuminance(color: ColorInput): number {
	const [r, g, b] = parseColor(color)

	return 0.2126 * decodeGamma(r) + 0.7152 * decodeGamma(g) + 0.0722 * decodeGamma(b)
}

/**
 * The WCAG contrast ratio between two colours, from `1` (identical) to `21`
 * (black on white). Order-independent.
 */
export function contrastRatio(a: ColorInput, b: ColorInput): number {
	const la = relativeLuminance(a)
	const lb = relativeLuminance(b)

	const [hi, lo] = la > lb ? [la, lb] : [lb, la]

	return (hi + 0.05) / (lo + 0.05)
}

/**
 * Whether two colours meet a contrast `threshold`.
 *
 * @param threshold - A named {@link ContrastLevel} or a raw ratio to clear.
 * @defaultValue `'AA'` (4.5:1)
 */
export function meetsContrast(
	a: ColorInput,
	b: ColorInput,
	threshold: ContrastThreshold = 'AA',
): boolean {
	return contrastRatio(a, b) >= contrastFloor(threshold)
}

/**
 * Pick the readable ink for a `background` from an ordered list of candidates:
 * the first that clears the `threshold` against the background, so leading the
 * list with the preferred ink (say white) yields it wherever it stays legible.
 * When none clears, the highest-contrast candidate is returned as the best
 * available fallback.
 *
 * @param threshold - A named {@link ContrastLevel} or a raw ratio an ink must clear to win outright.
 * @defaultValue `'AA'` (4.5:1)
 * @returns The chosen candidate, from `inks`.
 * @throws If `inks` is empty.
 */
export function readableInk<Ink extends ColorInput>(
	background: ColorInput,
	inks: readonly Ink[],
	threshold: ContrastThreshold = 'AA',
): Ink {
	const floor = contrastFloor(threshold)

	let best: Ink | undefined
	let bestRatio = Number.NEGATIVE_INFINITY

	for (const ink of inks) {
		const ratio = contrastRatio(background, ink)

		if (ratio >= floor) return ink

		if (ratio > bestRatio) {
			best = ink
			bestRatio = ratio
		}
	}

	if (best === undefined) throw new Error('readableInk needs at least one candidate ink')

	return best
}
