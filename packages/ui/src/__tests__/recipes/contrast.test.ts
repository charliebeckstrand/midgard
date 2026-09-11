// @vitest-environment node
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { extendedColors } from '../../core/recipe'
import { k as commandPalette } from '../../recipes/kata/command-palette'
import { k as grid } from '../../recipes/kata/grid'
import { k as list } from '../../recipes/kata/list'
import { k as menu } from '../../recipes/kata/menu'
import { k as nav } from '../../recipes/kata/nav'
import { k as option } from '../../recipes/kata/option'
import { hannou, iro, omote } from '../../recipes/kiso'
import {
	onSurface as extendedOnSurface,
	onTint as extendedOnTint,
} from '../../recipes/kiso/iro/extended-palette'
import { marker, onSurface, onTint, strong } from '../../recipes/kiso/iro/ramp'
import { segment } from '../../recipes/kiso/segment'
import { contrastOf, SURFACE, tinted } from '../helpers/contrast'
import { collectPatternViolations, srcDir } from '../helpers/walk-source'

/**
 * Drift guard for the iro colour ramp. Asserts every foreground rung clears
 * its contrast floor against its declared surface, in both light and dark modes,
 * resolved straight from Tailwind's theme.
 *
 * Floors: 4.5:1 for text (WCAG 1.4.3), 3:1 for the graphical marker (1.4.11).
 */

const COLORS = ['zinc', 'red', 'amber', 'green', 'blue'] as const

const TEXT_AA = 4.5

const NON_TEXT_AA = 3

describe('iro ramp contrast', () => {
	it('reproduces the documented green-600-on-white ratio (helper sanity)', () => {
		// green-600 on white measures 3.21:1.
		expect(contrastOf('text-green-600', SURFACE.light)).toBeCloseTo(3.21, 1)
	})

	describe('onSurface clears text AA on the page surface', () => {
		it.each(COLORS)('%s', (color) => {
			const [light, dark] = onSurface[color]

			expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)
		})
	})

	describe('onTint clears text AA on the soft fill and a plain surface', () => {
		it.each(COLORS)('%s', (color) => {
			const [light, dark] = onTint[color]

			// The 15% soft-palette wash behind this foreground.
			const wash = iro.palette.soft.bg[color].join(' ')

			expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(contrastOf(light, tinted(wash, SURFACE.light))).toBeGreaterThanOrEqual(TEXT_AA)

			expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(contrastOf(dark, tinted(wash, SURFACE.dark))).toBeGreaterThanOrEqual(TEXT_AA)
		})
	})

	it('strong (max-emphasis neutral) clears text AA', () => {
		const [light, dark] = strong

		expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)

		expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)
	})

	describe('marker clears non-text 3:1 on the page surface', () => {
		it.each(COLORS)('%s', (color) => {
			const [light, dark] = marker[color]

			expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(NON_TEXT_AA)

			expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(NON_TEXT_AA)
		})
	})
})

/**
 * The same drift guard for the opt-in extended palette (`iro.extendedPalette`).
 * The extended ramp only carries the two foreground roles the wide palette
 * reads — `onSurface` (bare text) and `onTint` (plain / soft / outline text) —
 * so both must clear text AA on their declared surfaces in both modes.
 */
describe('iro extended palette contrast', () => {
	describe('onSurface clears text AA on the page surface', () => {
		it.each(extendedColors)('%s', (color) => {
			const [light, dark] = extendedOnSurface[color]

			expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)
		})
	})

	describe('onTint clears text AA on the soft fill and a plain surface', () => {
		it.each(extendedColors)('%s', (color) => {
			const [light, dark] = extendedOnTint[color]

			// The 15% soft-palette wash behind this foreground.
			const wash = iro.extendedPalette.soft.bg[color].join(' ')

			expect(contrastOf(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(contrastOf(light, tinted(wash, SURFACE.light))).toBeGreaterThanOrEqual(TEXT_AA)

			expect(contrastOf(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(contrastOf(dark, tinted(wash, SURFACE.dark))).toBeGreaterThanOrEqual(TEXT_AA)
		})
	})
})

/**
 * A recipe's `[light, dark]` classes as a mode record; `mode()` returns
 * `string[]`, which loses the tuple. Exactly two entries, and it throws
 * otherwise: `mode()` flattens, so a pair carrying several classes per side
 * (`hannou.fg.disabled` is four) would otherwise read two light classes as
 * the pair and measure the wrong ground without failing.
 */
function byMode(classes: readonly string[]): { light: string; dark: string } {
	const [light, dark] = classes

	if (classes.length !== 2 || light === undefined || dark === undefined)
		throw new Error(`not a [light, dark] pair: ${classes.join(' ')}`)

	return { light, dark }
}

const MODES = ['light', 'dark'] as const

type Mode = (typeof MODES)[number]

const TINT = byMode(omote.bg.tint)

/** The composited ground `omote.bg.tint` paints over the page surface, per mode. */
const WASH = { light: tinted(TINT.light, SURFACE.light), dark: tinted(TINT.dark, SURFACE.dark) }

const HOVER = byMode(hannou.tint)

/**
 * The composited ground the interaction washes paint: `hannou.tint` (hover /
 * focus), `hannou.active` (the roved row), and `hannou.item`, which bundles the
 * first.
 *
 * Kept apart from {@link WASH} rather than folded into it. The two agree in
 * light — both `zinc-950/5` — and part in dark, where `omote.bg.tint` is
 * `white/10` against these at `white/5`. A different ground is a different
 * measurement, and assuming they agree is the transcription this file refuses.
 */
const HOVER_WASH = {
	light: tinted(HOVER.light, SURFACE.light),
	dark: tinted(HOVER.dark, SURFACE.dark),
}

/** The muted rung every consumer of that wash inks with. */
const MUTED = byMode(iro.onWash.muted)

/**
 * A foreground class carrying a palette colour, whatever utility and state
 * prefixes it wears (`dark:has-disabled:text-zinc-400`). Filters a recipe
 * fragment down to its inks, so a fragment mixing ink with layout
 * (`hannou.nav.base` carries an icon-slot size) is measured as declared rather
 * than transcribed. The hues come off `core/recipe`'s own lists: a fourth copy
 * of them here would silently stop matching a newly added colour, and an ink
 * this filter drops is an ink the guard below never measures.
 */
const FOREGROUND = new RegExp(
	`(?:^|:)text-(?:(?:${[...COLORS, ...extendedColors].join('|')})-\\d{2,3}|white|black)\\b`,
)

/**
 * A recipe surface as the layer hands it over: the space-joined string a
 * resolved `defineRecipe` call returns, or the arbitrarily nested fragment
 * arrays a kata composes out of kiso tokens.
 */
type ClassTree = string | readonly ClassTree[]

/** A recipe surface flattened to the individual classes it paints. */
const classesOf = (surface: ClassTree): string[] =>
	typeof surface === 'string' ? surface.split(/\s+/).filter(Boolean) : surface.flatMap(classesOf)

/** The foreground classes of a set of recipe surfaces, split by the mode each paints in. */
function inksByMode(surfaces: readonly ClassTree[]): Record<Mode, string[]> {
	const inks = surfaces.flatMap(classesOf).filter((cls) => FOREGROUND.test(cls))

	return {
		light: inks.filter((cls) => !cls.startsWith('dark:')),
		dark: inks.filter((cls) => cls.startsWith('dark:')),
	}
}

/**
 * Every recipe that paints `omote.bg.tint`, against the surfaces whose ink
 * lands on that wash — read off the recipes themselves, not transcribed, so
 * what is measured is what a consumer actually paints. For the segment
 * archetype those surfaces sit in a different file from the track.
 *
 * `surfaces: []` marks a recipe that hands the wash to content it doesn't ink,
 * so no ink of its own can be measured: `toolbar` hosts Buttons carrying their
 * own variant colours, and `box` surfaces the wash for arbitrary children
 * (`<Box bg="tint">`) — the case the shared rung exists for, and the one no
 * static guard can reach.
 *
 * A file, not a token, keys this: the pairing is what needs registering, and
 * the completeness case below reconciles the list against the recipe tree, so
 * a new tint consumer can't ship without landing here first.
 *
 * The reconciliation is keyed on every spelling that reaches a wash, not on one
 * token: `bg.tint` for the opaque fill, and `hannou.tint` / `hannou.active` /
 * `hannou.item` for the interaction washes. Each entry names the ground its
 * inks land on, so the two grounds are measured apart where they differ.
 */
const TINT_CONSUMERS: readonly {
	file: string
	surfaces: readonly ClassTree[]
	/** The composited ground this file's inks sit on. @defaultValue WASH */
	ground?: typeof WASH
	/**
	 * Inks this file paints on some *other* ground, named so the wash rule skips
	 * them. Each one is a state that re-grounds the row — a focused menu row
	 * swaps to a solid accent fill — and is measured against that fill by the
	 * archetype that owns it, not here.
	 */
	regrounded?: readonly string[]
}[] = [
	// The `solid` row variant, inked by the row itself, `description`, and the
	// interactive `content` column.
	{
		file: 'recipes/kata/list.ts',
		surfaces: [list.item({ variant: 'solid' }), list.content(true), list.description],
	},
	// `batch.bar`, which `batch.count` nests inside.
	{ file: 'recipes/kata/grid.ts', surfaces: [grid.batch.count] },
	// The control track, inked by `segment/item.ts`.
	{ file: 'recipes/kiso/segment/control.ts', surfaces: [segment.item.base] },
	// The `solid` bar; items ink at `hannou.nav.base`, not at a muted rung.
	{ file: 'recipes/kata/nav.ts', surfaces: [nav.item.button({ affix: false })] },
	{ file: 'recipes/kata/toolbar.ts', surfaces: [] },
	{ file: 'recipes/kata/box.ts', surfaces: [] },
	// The interaction washes. `hannou.item` grounds a hovered or focused row and
	// `hannou.active` a roved one; both sit a step darker than `bg.tint` in dark.
	{
		file: 'recipes/kata/menu.ts',
		surfaces: [menu.item({}), menu.description],
		ground: HOVER_WASH,
		// The focused row takes a solid accent fill, not the wash.
		regrounded: ['group-focus/option:text-white'],
	},
	{
		file: 'recipes/kata/option.ts',
		surfaces: [option.base, option.description],
		ground: HOVER_WASH,
	},
	{
		file: 'recipes/kata/command-palette.ts',
		surfaces: [commandPalette.item, commandPalette.description],
		ground: HOVER_WASH,
	},
]

/**
 * The tint-wash foreground rule. `omote.bg.tint` is not the page surface: it
 * composites to `#f3f3f3` in light, where the ramp's `onSurface` rungs — tuned
 * for the page — lose AA (zinc 4.34:1, red 4.28:1, green 4.44:1 against a
 * 4.5:1 floor). `iro.onWash.muted` is the rung that clears it, and this
 * block holds every recipe painting that wash to it, so the next kata that
 * grounds a page-surface ink on the tint fails here rather than in Chromium.
 *
 * Every ground and ink is read off the recipes, never transcribed: what is
 * asserted is what the recipes paint.
 */
describe('tint wash foreground contrast', () => {
	// One rung across every `kata/list` row variant rather than a `variant` ×
	// `interactive` compound, so it lands on the wash (`solid`) and on the page
	// surface (`separated` / `outline` / `plain`) and must clear AA on both.
	it.each(MODES)('the shared muted rung clears text AA in %s mode', (m) => {
		expect(contrastOf(MUTED[m], WASH[m])).toBeGreaterThanOrEqual(TEXT_AA)

		expect(contrastOf(MUTED[m], SURFACE[m])).toBeGreaterThanOrEqual(TEXT_AA)
	})

	/**
	 * Reconciles the registry against the recipe tree, which is what makes this a
	 * rule and not a list. Comments are stripped so prose naming the token — this
	 * file's own subject — doesn't read as a consumer; `omote/bg.ts` declares the
	 * fill as `tint:` and so never matches. The `boundary` project owns source
	 * scans generally, but this one is only meaningful beside the registry it
	 * reconciles, so it stays here rather than splitting the pair across projects.
	 */
	it('registers every recipe that paints the wash', () => {
		const painted = collectPatternViolations({
			dir: join(srcDir, 'recipes'),
			patterns: [
				{ label: 'bg.tint', regex: /\bbg\.tint\b/g },
				{ label: 'hannou.tint', regex: /\bhannou\.tint\b/g },
				{ label: 'hannou.active', regex: /\bhannou\.active\b/g },
				{ label: 'hannou.item', regex: /\bhannou\.item\b/g },
			],
			stripComments: true,
		}).map((line) => line.split(' → ')[0])

		expect([...new Set(painted)].sort()).toEqual([...TINT_CONSUMERS.map(({ file }) => file)].sort())
	})

	// Only the consumers that declare an ink of their own; a `surfaces: []` entry
	// has nothing to measure and would assert `[] === []` in its name's stead.
	describe.each(TINT_CONSUMERS.filter(({ surfaces }) => surfaces.length > 0))('$file', ({
		surfaces,
		ground = WASH,
		regrounded = [],
	}) => {
		const inks = inksByMode(surfaces)

		it.each(MODES)('grounds no ink below text AA on the wash in %s mode', (m) => {
			const failing = inks[m]
				.filter((ink) => !regrounded.includes(ink))
				.flatMap((ink) => {
					const ratio = contrastOf(ink, ground[m])

					return ratio < TEXT_AA ? [`${ink} @ ${ratio.toFixed(2)}:1`] : []
				})

			expect(failing).toEqual([])
		})
	})
})

/**
 * Segment archetype separation. The 1.4.3 floor for both of its inks is covered
 * by the tint-wash rule above; what is archetype-specific is the step between
 * them, which is what marks the current item — the selected ink sits on the
 * sliding pill, the resting ink on the track.
 */
describe('segment archetype contrast', () => {
	const indicator = byMode(segment.indicator)

	/** The sliding pill the selected item sits on. */
	const PILL = {
		light: tinted(indicator.light, SURFACE.light),
		dark: tinted(indicator.dark, SURFACE.dark),
	}

	/** The ink the selected item steps to; it steps up from the shared `MUTED` rung. */
	const SELECTED = byMode(hannou.fg.current)

	const SEPARATION = 2

	it.each(MODES)('selected item clears text AA on the %s pill', (m) => {
		expect(segment.item.base).toContain(SELECTED[m])

		expect(contrastOf(SELECTED[m], PILL[m])).toBeGreaterThanOrEqual(TEXT_AA)
	})

	// Both inks read off the same ground, so the comparison is like-for-like:
	// clearing AA by darkening the resting item the rest of the way to the
	// selected ink would satisfy 1.4.3 and erase the distinction.
	it.each(MODES)('resting stays subordinate to selected in %s mode', (m) => {
		expect(segment.item.base).toContain(MUTED[m])

		expect(contrastOf(SELECTED[m], WASH[m])).toBeGreaterThanOrEqual(
			SEPARATION * contrastOf(MUTED[m], WASH[m]),
		)
	})
})
