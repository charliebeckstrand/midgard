// @vitest-environment node
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { colors, extendedColors } from '../../core/recipe'
import { k as commandPalette } from '../../recipes/kata/command-palette'
import { k as kanban } from '../../recipes/kata/kanban'
import { k as list } from '../../recipes/kata/list'
import { k as menu } from '../../recipes/kata/menu'
import { k as nav } from '../../recipes/kata/nav'
import { k as option } from '../../recipes/kata/option'
import { k as pdfViewer } from '../../recipes/kata/pdf-viewer'
import { k as tabs } from '../../recipes/kata/tabs'
import { hannou, iro, omote } from '../../recipes/kiso'
import {
	onSurface as extendedOnSurface,
	onTint as extendedOnTint,
} from '../../recipes/kiso/iro/extended-palette'
import { marker, onSurface, onTint, strong } from '../../recipes/kiso/iro/ramp'
import { getContrast, SURFACE, tinted } from '../helpers/contrast'
import { collectPatternViolations, srcDir } from '../helpers/walk-source'

/**
 * Drift guard for the iro color ramp. Asserts every foreground rung clears
 * its contrast floor against its declared surface, in both light and dark modes,
 * resolved straight from Tailwind's theme.
 *
 * Floors: 4.5:1 for text (WCAG 1.4.3), 3:1 for the graphical marker (1.4.11).
 */

const TEXT_AA = 4.5

const NON_TEXT_AA = 3

const { segment } = tabs

describe('iro ramp contrast', () => {
	it('reproduces the documented green-600-on-white ratio (helper sanity)', () => {
		// green-600 on white measures 3.21:1.
		expect(getContrast('text-green-600', SURFACE.light)).toBeCloseTo(3.21, 1)
	})

	describe('onSurface clears text AA on the page surface', () => {
		it.each(colors)('%s', (color) => {
			const [light, dark] = onSurface[color]

			expect(getContrast(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(getContrast(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)
		})
	})

	describe('onTint clears text AA on the soft fill and a plain surface', () => {
		it.each(colors)('%s', (color) => {
			const [light, dark] = onTint[color]

			// The 15% soft-palette wash behind this foreground.
			const wash = iro.palette.soft.bg[color].join(' ')

			expect(getContrast(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(getContrast(light, tinted(wash, SURFACE.light))).toBeGreaterThanOrEqual(TEXT_AA)

			expect(getContrast(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(getContrast(dark, tinted(wash, SURFACE.dark))).toBeGreaterThanOrEqual(TEXT_AA)
		})
	})

	it('strong (max-emphasis neutral) clears text AA', () => {
		const [light, dark] = strong

		expect(getContrast(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)

		expect(getContrast(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)
	})

	describe('marker clears non-text 3:1 on the page surface', () => {
		it.each(colors)('%s', (color) => {
			const [light, dark] = marker[color]

			expect(getContrast(light, SURFACE.light)).toBeGreaterThanOrEqual(NON_TEXT_AA)

			expect(getContrast(dark, SURFACE.dark)).toBeGreaterThanOrEqual(NON_TEXT_AA)
		})
	})
})

/**
 * The same drift guard for the opt-in extended palette (`iro.extended`).
 * The extended ramp only carries the two foreground roles the wide palette
 * reads — `onSurface` (bare text) and `onTint` (plain / soft / outline text) —
 * so both must clear text AA on their declared surfaces in both modes.
 */
describe('iro extended palette contrast', () => {
	describe('onSurface clears text AA on the page surface', () => {
		it.each(extendedColors)('%s', (color) => {
			const [light, dark] = extendedOnSurface[color]

			expect(getContrast(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(getContrast(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)
		})
	})

	describe('onTint clears text AA on the soft fill and a plain surface', () => {
		it.each(extendedColors)('%s', (color) => {
			const [light, dark] = extendedOnTint[color]

			// The 15% soft-palette wash behind this foreground.
			const wash = iro.extended.soft.bg[color].join(' ')

			expect(getContrast(light, SURFACE.light)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(getContrast(light, tinted(wash, SURFACE.light))).toBeGreaterThanOrEqual(TEXT_AA)

			expect(getContrast(dark, SURFACE.dark)).toBeGreaterThanOrEqual(TEXT_AA)

			expect(getContrast(dark, tinted(wash, SURFACE.dark))).toBeGreaterThanOrEqual(TEXT_AA)
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

const HOVER = byMode(hannou.tint.base)

/**
 * The composited ground the interaction washes paint: `hannou.tint` (hover /
 * focus), `hannou.active` (the roved row), and the item group (`kumi/item`),
 * which bundles both.
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
const MUTED = byMode(iro.on.wash.muted)

/**
 * A foreground class carrying a palette color, whatever utility and state
 * prefixes it wears (`dark:has-disabled:text-zinc-400`). Filters a recipe
 * fragment down to its inks, so a fragment mixing ink with layout
 * (a nav item carries `select-none`) is measured as declared rather
 * than transcribed. The hues come off `core/recipe`'s own lists: a fourth copy
 * of them here would silently stop matching a newly added color, and an ink
 * this filter drops is an ink the guard below never measures.
 */
const FOREGROUND = new RegExp(
	`(?:^|:)text-(?:(?:${[...colors, ...extendedColors].join('|')})-\\d{2,3}|white|black)\\b`,
)

/**
 * A recipe surface as the layer hands it over: the space-joined string a
 * resolved `defineRecipe` call returns, or the arbitrarily nested fragment
 * arrays a kata composes out of kiso tokens.
 */
type ClassTree = string | readonly ClassTree[]

/** A recipe surface flattened to the individual classes it paints. */
const getClasses = (surface: ClassTree): string[] =>
	typeof surface === 'string' ? surface.split(/\s+/).filter(Boolean) : surface.flatMap(getClasses)

/** The foreground classes of a set of recipe surfaces, split by the mode each paints in. */
function inksByMode(surfaces: readonly ClassTree[]): Record<Mode, string[]> {
	const inks = surfaces.flatMap(getClasses).filter((className) => FOREGROUND.test(className))

	return {
		light: inks.filter((className) => !className.startsWith('dark:')),
		dark: inks.filter((className) => className.startsWith('dark:')),
	}
}

/**
 * Every recipe that paints `omote.bg.tint`, against the surfaces whose ink
 * lands on that wash — read off the recipes themselves, not transcribed, so
 * what is measured is what a consumer actually paints.
 *
 * `surfaces: []` marks a recipe that hands the wash to content it doesn't ink,
 * so no ink of its own can be measured: `toolbar` hosts Buttons carrying their
 * own variant colors, and `box` surfaces the wash for arbitrary children
 * (`<Box bg="tint">`) — the case the shared rung exists for, and the one no
 * static guard can reach.
 *
 * A file, not a token, keys this: the pairing is what needs registering, and
 * the completeness case below reconciles the list against the recipe tree, so
 * a new tint consumer can't ship without landing here first.
 *
 * The reconciliation is keyed on every spelling that reaches a wash, not on one
 * token: `bg.tint` for the opaque fill, and `hannou.tint` / `hannou.active` /
 * the item group for the interaction washes. Each entry names the ground its
 * inks land on, so the two grounds are measured apart where they differ.
 */
const TINT_CONSUMERS: readonly {
	file: string
	surfaces: readonly ClassTree[]
	/** The composited ground this file's inks sit on. @defaultValue WASH */
	ground?: typeof WASH
}[] = [
	// The `solid` row variant, inked by the row itself, `description`, and the
	// interactive `content` column.
	{
		file: 'recipes/kata/list.ts',
		surfaces: [
			list.item({ variant: 'solid' }),
			list.content({ interactive: true }),
			list.description,
		],
	},
	// The segment box, inked by its items.
	{ file: 'recipes/kata/tabs.ts', surfaces: [segment.item] },
	// The `solid` bar; items ink at `iro.text.default`, not at a muted rung.
	{ file: 'recipes/kata/nav.ts', surfaces: [nav.item({ affix: false }).button] },
	{ file: 'recipes/kata/toolbar.ts', surfaces: [] },
	{ file: 'recipes/kata/box.ts', surfaces: [] },
	// The skeleton bubble, which holds placeholders and no ink.
	{ file: 'recipes/kata/chat-transcript.ts', surfaces: [] },
	// The interaction washes. The item group grounds a hovered or focused row and
	// `hannou.active` a roved one; both sit a step darker than `bg.tint` in dark.
	{
		file: 'recipes/kata/menu.ts',
		surfaces: [menu.item().base, menu.item().description],
		ground: HOVER_WASH,
	},
	{
		file: 'recipes/kata/option.ts',
		surfaces: [option().base, option().description],
		ground: HOVER_WASH,
	},
	{
		file: 'recipes/kata/command-palette.ts',
		surfaces: [commandPalette.item().base, commandPalette.item().description],
		ground: HOVER_WASH,
	},
]

/**
 * The tint-wash foreground rule. `omote.bg.tint` is not the page surface: it
 * composites to `#f3f3f3` in light, where the ramp's `onSurface` rungs — tuned
 * for the page — lose AA (zinc 4.34:1, red 4.28:1, green 4.44:1 against a
 * 4.5:1 floor). `iro.on.wash.muted` is the rung that clears it, and this
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
	it.each(MODES)('the shared muted rung clears text AA in %s mode', (mode) => {
		expect(getContrast(MUTED[mode], WASH[mode])).toBeGreaterThanOrEqual(TEXT_AA)

		expect(getContrast(MUTED[mode], SURFACE[mode])).toBeGreaterThanOrEqual(TEXT_AA)
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
				{ label: 'item group', regex: /\bfrom '\.\.\/kumi\/item'/g },
			],
			stripComments: true,
		}).map((line) => line.split(' → ')[0])

		expect([...new Set(painted)].sort()).toEqual([...TINT_CONSUMERS.map(({ file }) => file)].sort())
	})

	// Only the consumers that declare an ink of their own; a `surfaces: []` entry
	// has nothing to measure and would assert `[] === []` in its name's stead.
	describe.each(TINT_CONSUMERS.filter(({ surfaces }) => surfaces.length > 0))(
		'$file',
		({ surfaces, ground = WASH }) => {
			const inks = inksByMode(surfaces)

			it.each(MODES)('grounds no ink below text AA on the wash in %s mode', (mode) => {
				const failing = inks[mode].flatMap((ink) => {
					const ratio = getContrast(ink, ground[mode])

					return ratio < TEXT_AA ? [`${ink} @ ${ratio.toFixed(2)}:1`] : []
				})

				expect(failing).toEqual([])
			})
		},
	)
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

	it.each(MODES)('selected item clears text AA on the %s pill', (mode) => {
		expect(segment.item).toContain(SELECTED[mode])

		expect(getContrast(SELECTED[mode], PILL[mode])).toBeGreaterThanOrEqual(TEXT_AA)
	})

	// Both inks read off the same ground, so the comparison is like-for-like:
	// clearing AA by darkening the resting item the rest of the way to the
	// selected ink would satisfy 1.4.3 and erase the distinction.
	it.each(MODES)('resting stays subordinate to selected in %s mode', (mode) => {
		expect(segment.item).toContain(MUTED[mode])

		expect(getContrast(SELECTED[mode], WASH[mode])).toBeGreaterThanOrEqual(
			SEPARATION * getContrast(MUTED[mode], WASH[mode]),
		)
	})
})

/**
 * The message of a PdfViewer that failed to load, or that has no pages, sits
 * on the opaque gray of the viewport, not on the page surface. The ground and
 * the ink come off the recipe, so a change to either is measured here.
 */
describe('PdfViewer viewport message', () => {
	const getClasses = (fragment: unknown): string[] =>
		[fragment].flat(Number.POSITIVE_INFINITY).join(' ').split(' ').filter(Boolean)

	const ground = getClasses(pdfViewer.viewport.base).filter((className) =>
		/^(?:dark:)?bg-zinc-\d+$/.test(className),
	)

	const ink = getClasses(pdfViewer.viewport.page.empty).filter((className) =>
		FOREGROUND.test(className),
	)

	const GROUND = byMode(ground)

	const INK = byMode(ink)

	it.each(MODES)('clears text AA on the %s viewport', (mode) => {
		const surface = tinted(GROUND[mode].replace('dark:', ''), SURFACE[mode])

		expect(getContrast(INK[mode], surface)).toBeGreaterThanOrEqual(TEXT_AA)
	})
})

/**
 * A Kanban column is a `Card` with the tint fill (`omote.bg.tint`), and the
 * empty message of a column sits on that fill. The Card takes the fill through
 * its `bg` prop, so the tint-wash registry above cannot see the pairing, and
 * this block measures it. A column that shows its empty message holds no card,
 * so it never takes the `data-over` fill.
 */
describe('Kanban empty column message', () => {
	const inks = inksByMode([kanban.column.empty])

	it.each(MODES)('clears text AA on the %s column fill', (mode) => {
		expect(inks[mode]).not.toEqual([])

		for (const ink of inks[mode])
			expect(getContrast(ink, WASH[mode]), ink).toBeGreaterThanOrEqual(TEXT_AA)
	})
})
