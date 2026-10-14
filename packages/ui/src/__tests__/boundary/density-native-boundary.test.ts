// @vitest-environment node
import { readdirSync } from 'node:fs'
import { join, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import { utilityTable } from '../../core/density/utility-table'
import {
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// A density-native component takes its step from the nearest density scope.
// Its kata writes each step in a stepped `density-*` utility, so the DOM selects the
// step and no JS code selects it. Two rules hold that design:
//
//   - No recipe of the component has a `size` or a `density` axis. The walk
//     below reads each recipe of each kata, so a new kata is native by default.
//   - The component reads no density context. An explicit `size` becomes a
//     scope (the `density` prop of PolymorphicStatic or Box), not a lookup. The
//     reader allowlists at the end of this file hold this rule for each file.

/** The kata modules, by the path under `src`. */
function recipeFiles(): string[] {
	return readdirSync(join(srcDir, 'recipes', 'kata'))
		.filter((file) => file.endsWith('.ts'))
		.map((file) => `recipes/kata/${file}`)
		.sort()
}

/** A recipe: a callable with the config it was defined from. */
type Recipe = { config: { variants?: Record<string, unknown> } }

function isRecipe(value: unknown): value is Recipe {
	return typeof value === 'function' && 'config' in value
}

/** The path of each recipe under `value` that has a `size` or a `density` axis. */
function steppedAxes(value: unknown, path: string, seen: Set<unknown>, found: string[]) {
	if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return

	if (seen.has(value)) return

	seen.add(value)

	if (isRecipe(value)) {
		const axes = Object.keys(value.config.variants ?? {})

		if (axes.includes('size') || axes.includes('density')) found.push(path)
	}

	for (const [key, child] of Object.entries(value)) {
		if (key !== 'config') steppedAxes(child, `${path}.${key}`, seen, found)
	}
}

describe('density-native boundary', () => {
	const files = recipeFiles()

	it('no kata recipe has a size or density axis', async () => {
		const found: string[] = []

		// The modules are independent, so they load at once.
		const modules: Record<string, unknown>[] = await Promise.all(
			files.map((file) => import(join(srcDir, file))),
		)

		for (const [index, file] of files.entries()) {
			const module = modules[index] ?? {}

			const name = file.replace(/^recipes\/kata\//, '').replace(/\.ts$/, '')

			const seen = new Set<unknown>()

			for (const [key, value] of Object.entries(module)) {
				steppedAxes(value, `${name}:${key}`, seen, found)
			}
		}

		expect(found).toEqual([])
	})

	it('walks the recipes of each kata', () => {
		// A walk that read no file would pass the case above with an empty list.
		expect(files.length).toBeGreaterThan(50)

		expect(files).toContain('recipes/kata/sidebar-layout.ts')
	})
})

/** The code of each source file, with the comments removed, read once for each scan below. */
const sources: { file: string; code: string }[] = []

walkSource(srcDir, (file, content) => {
	if (isSourceFile(file))
		sources.push({ file: srcRelative(file), code: stripSourceComments(content) })
})

/** The source files whose code, with the comments removed, matches `pattern`. */
function filesMatching(pattern: RegExp): string[] {
	return sources
		.filter(({ code }) => pattern.test(code))
		.map(({ file }) => file)
		.sort()
}

// A density scope has two channels: `data-density` for the stepped classes and
// the density context for a client reader. A scope is the `density` prop of the
// host primitive (PolymorphicStatic, Box, ControlFrame, PopoverPanel, or
// FloatingSurface), which writes both channels in one place. Only the files
// below open the context by hand:
//
//   - The primitives that own the prop.
//   - Button, whose element is the registered link or a `<button>`, and Drawer,
//     whose element is a `motion.div`. Each writes both channels itself.
//   - The grid's `GridOverlayDensity`, a context-only relay around a surface
//     that writes its own `data-density`. Its context is private to its file.

const CONTEXT_OPENERS = [
	'components/button/button.tsx',
	'components/drawer/drawer.tsx',
	'modules/grid/grid-region.tsx',
	'primitives/floating-surface/floating-surface.tsx',
	'primitives/polymorphic/polymorphic-static.tsx',
	'primitives/popover/popover-panel.tsx',
]

const CONTEXT_OPEN = /<Density\b/

describe('density scopes', () => {
	it('only the listed files open the density context by hand', () => {
		expect(filesMatching(CONTEXT_OPEN)).toEqual(CONTEXT_OPENERS)
	})
})

// A class selects a density step through the `density-*` variants and the
// stepped utilities. Those rank each match by the depth of its scope. A
// `data-[density=…]` selector has no rank, so an outer scope can win over the
// nearest one. The source therefore writes no such selector.

const DENSITY_SELECTOR = /data-\[density=/

describe('density selectors', () => {
	it('no source file selects a step with a data-[density=…] class', () => {
		expect(filesMatching(DENSITY_SELECTOR)).toEqual([])
	})
})

// A pseudo-element ends a selector. A step variant after a pseudo-element
// variant, such as `before:density-md:p-3`, therefore writes rules that no
// browser can match: the rung of the element itself puts an attribute after the
// pseudo-element. The step variant comes first, as in `density-md:before:p-3`
// or `density-[xs,sm]:before:p-2`. A stepped class after a pseudo-element, such
// as `before:density-p-[2,3,4]`, takes the custom properties that the
// pseudo-element inherits, so it works. Until the recipes stop using the step
// variants, this check also holds the stepped classes, so the source keeps one
// form.

const PSEUDO_THEN_DENSITY =
	/(?<![\w-])(?:before|after|placeholder|file|marker|selection|backdrop|first-line|first-letter|\[&::[^\]\s]+\]):[^\s'"`]*?density-/

describe('density after a pseudo-element', () => {
	it('no source file puts a density class after a pseudo-element variant', () => {
		expect(filesMatching(PSEUDO_THEN_DENSITY)).toEqual([])
	})
})

// A stepped class reads the custom properties that its element inherits.
// Before Chrome 122, `::backdrop` does not inherit from its element, so a
// density class after `backdrop:` takes no step there.

const BACKDROP_DENSITY = /(?<![\w-])backdrop:[^\s'"`]*?density-/

describe('density after backdrop', () => {
	it('no source file puts a density class after the backdrop variant', () => {
		expect(filesMatching(BACKDROP_DENSITY)).toEqual([])
	})
})

// A stepped class writes one rule in the layer `density-0`. A step variant
// writes its rungs in `density-0`, `density-1`, and `density-2`. When both set
// one property of one element, the two rules have the same rank at a root at
// `md`, and the order of the rules in the sheet decides. In each other case,
// the rung of the step variant wins. So a class
// list must not hold both on one property. The panel of a dialog is the one
// exception: its stepped bottom inset (`density-pb-[4,5,6,7,8]`) and its
// `max-sm:density-<step>:pb-[…]` safe-area inset are on one element. The
// variant is later in the sheet, so it wins at `md` too, and
// `browser/density-contract.test.tsx` holds the inset at each step. The check
// reads one class list at a time, so it does not see a step variant on an
// ancestor (`*:` or `**:`) that meets a stepped class on a child.

/** The overlaps that the check permits: the recipe, the variant target, and the property. */
const STEPPED_AND_VARIANT = ['dialog:k.panel padding-bottom']

/** Splits a class at each `:` that is not in brackets or parentheses. */
function segments(token: string): string[] {
	const parts: string[] = []

	let depth = 0

	let start = 0

	for (let index = 0; index < token.length; index++) {
		const char = token[index]

		if (char === '[' || char === '(') depth++
		else if (char === ']' || char === ')') depth--
		else if (char === ':' && depth === 0) {
			parts.push(token.slice(start, index))

			start = index + 1
		}
	}

	return [...parts, token.slice(start)]
}

/** A step variant: `density-<step>` or `density-[<steps>]`. */
const STEP_VARIANT = /^density-(?:xs|sm|md|lg|xl|\[[a-z,]+\])$/

/**
 * A variant that changes the element that a class styles: a pseudo-element, a
 * child variant, or an arbitrary variant with a pseudo-element or a
 * combinator. Each other variant, such as `max-sm` or `hover`, is a condition
 * on the same element.
 */
const TARGET_VARIANT =
	/^(?:before|after|placeholder|file|marker|selection|backdrop|first-line|first-letter|\*|\*\*|\[&.*(?:::|[_>+~]).*\])$/

/** The longhands of each property that a density class can write. */
function longhands(property: string): string[] {
	const sides = (prefix: string) => ({
		[prefix]: ['top', 'bottom', 'inline-start', 'inline-end'].map((side) => `${prefix}-${side}`),
		[`${prefix}-inline`]: [`${prefix}-inline-start`, `${prefix}-inline-end`],
		[`${prefix}-block`]: [`${prefix}-top`, `${prefix}-bottom`],
	})

	const groups: Record<string, string[]> = {
		...sides('padding'),
		...sides('margin'),
		inset: ['top', 'bottom', 'inset-inline-start', 'inset-inline-end'],
		gap: ['column-gap', 'row-gap'],
	}

	return groups[property] ?? [property]
}

/** The properties of each plain utility that a step variant wraps, by its name. */
const plainUtilities: Record<string, readonly string[]> = {
	...Object.fromEntries(
		Object.entries(utilityTable).map(([name, entry]) => [name, entry.properties]),
	),
	start: utilityTable['inset-s'].properties,
	m: ['margin'],
	mx: ['margin-inline'],
	inset: ['inset'],
	leading: ['line-height'],
}

/** The properties of a plain utility, such as `-mx-1` or `[--gap:0]`, or none. */
function plainProperties(utility: string): readonly string[] {
	const arbitrary = /^\[(--?[\w-]+):/.exec(utility)

	if (arbitrary) return [arbitrary[1] as string]

	const bare = utility.replace(/^!?-?/, '')

	const name = Object.keys(plainUtilities)
		.filter((key) => bare === key || bare.startsWith(`${key}-`))
		.sort((a, b) => b.length - a.length)[0]

	return name ? (plainUtilities[name] ?? []) : []
}

/** A stepped class, such as `density-p-[2,3,4]` or `density-px-ring-[1,2,3]`, by its utility. */
const STEPPED = /^density-([a-z-]+?)(?:-ring)?-\[[^\]]+\]$/

/**
 * The properties that each class of `classes` sets, by the variant target and
 * the form of the class: `stepped` or `variant`.
 */
function writes(classes: readonly string[]) {
	const found = { stepped: new Set<string>(), variant: new Set<string>() }

	for (const token of classes) {
		const parts = segments(token)

		const utility = parts.at(-1) ?? ''

		const variants = parts.slice(0, -1)

		const target = variants.filter((variant) => TARGET_VARIANT.test(variant)).join(':')

		const stepped = STEPPED.exec(utility)?.[1]

		const entry = stepped
			? (utilityTable as Record<string, { properties: readonly string[] }>)[stepped]
			: undefined

		const [form, properties] = variants.some((variant) => STEP_VARIANT.test(variant))
			? (['variant', plainProperties(utility)] as const)
			: entry
				? (['stepped', entry.properties] as const)
				: (['none', []] as const)

		if (form === 'none') continue

		for (const property of properties.flatMap(longhands))
			found[form].add(`${target} ${property}`.trim())
	}

	return [...found.stepped].filter((key) => found.variant.has(key))
}

/** The class tokens of a class value: a string, or a nested list of them. */
function tokensOf(value: unknown): string[] {
	if (typeof value === 'string') return value.split(/\s+/).filter(Boolean)

	if (Array.isArray(value)) return value.flatMap(tokensOf)

	if (value && typeof value === 'object') return Object.values(value).flatMap(tokensOf)

	return []
}

/** The fields of a recipe config that are not a variant axis. */
const RESERVED = new Set(['base', 'palette', 'compound', 'slots', 'defaults', 'skeleton'])

/**
 * The class lists of a recipe: the base, the base with each option of each
 * axis, the base with each compound rule, and each slot.
 */
function classListsOf(config: Record<string, unknown>): string[][] {
	const base = tokensOf(config.base)

	const lists = [base]

	for (const [field, axis] of Object.entries(config)) {
		if (RESERVED.has(field) || !axis || typeof axis !== 'object') continue

		for (const option of Object.values(axis)) lists.push([...base, ...tokensOf(option)])
	}

	for (const rule of (config.compound as { class: unknown }[] | undefined) ?? []) {
		lists.push([...base, ...tokensOf(rule.class)])
	}

	for (const slot of Object.values((config.slots as Record<string, unknown> | undefined) ?? {})) {
		lists.push(tokensOf(slot))
	}

	return lists
}

/** The overlaps in each recipe and each class list under `value`, keyed by `path`. */
function overlapsIn(value: unknown, path: string, seen: Set<unknown>, found: Set<string>) {
	if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return

	if (seen.has(value)) return

	seen.add(value)

	const lists = isRecipe(value)
		? classListsOf(value.config as Record<string, unknown>)
		: Array.isArray(value)
			? [tokensOf(value)]
			: []

	for (const list of lists) for (const key of writes(list)) found.add(`${path} ${key}`)

	for (const [key, child] of Object.entries(value)) {
		if (key !== 'config') overlapsIn(child, `${path}.${key}`, seen, found)
	}
}

/** A string literal of the source. */
const LITERAL = /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g

describe('a stepped class and a step variant', () => {
	it('no recipe sets one property with a stepped class and a step variant', async () => {
		const files = readdirSync(join(srcDir, 'recipes'), { recursive: true, encoding: 'utf8' })
			.map((file) => `recipes/${file.split(sep).join('/')}`)
			.filter((file) => file.endsWith('.ts') && !file.endsWith('/index.ts'))
			.sort()

		const found = new Set<string>()

		const modules: Record<string, unknown>[] = await Promise.all(
			files.map((file) => import(join(srcDir, file))),
		)

		const seen = new Set<unknown>()

		for (const [index, file] of files.entries()) {
			const name = file.replace(/^recipes\/(?:kata\/)?/, '').replace(/\.ts$/, '')

			for (const [key, value] of Object.entries(modules[index] ?? {})) {
				overlapsIn(value, `${name}:${key}`, seen, found)
			}
		}

		expect([...found].sort()).toEqual(STEPPED_AND_VARIANT)
	})

	it('no class string of a source file sets one property with both', () => {
		const strings = sources.flatMap(({ file, code }) =>
			[...code.matchAll(LITERAL)]
				.map(([, , text]) => text ?? '')
				.filter((text) => text.includes('density-'))
				.map((text) => ({ file, text })),
		)

		// A scan that read no class string would pass with an empty list.
		expect(strings.length).toBeGreaterThan(100)

		const found = strings.flatMap(({ file, text }) =>
			writes(tokensOf(text)).map((key) => `${file} ${key}`),
		)

		expect(found).toEqual([])
	})

	it('finds the overlap of a stepped class and a step variant', () => {
		expect(writes(['density-px-[2,3,4]', 'density-md:px-2'])).toEqual([
			'padding-inline-start',
			'padding-inline-end',
		])

		expect(writes(['density-p-[2,3,4]', 'max-sm:density-[lg,xl]:-mb-1'])).toEqual([])

		expect(writes(['density-p-[2,3,4]', 'hover:density-sm:pb-2'])).toEqual(['padding-bottom'])

		expect(writes(['before:density-rounded-ring-[1,2,3]', 'density-md:rounded-2'])).toEqual([])

		expect(writes(['before:density-rounded-ring-[1,2,3]', 'density-md:before:rounded-2'])).toEqual([
			'before border-radius',
		])
	})
})

// A component that reads the step as a JS value paints the `md` step on the
// server and in the hydration render, so the markup is wrong at the first
// paint. Only the files below may read it. Each uses the value only for work
// after mount, or for a context that a client descendant reads after mount.
// Calendar reads it at the first paint, because its test needs no root step.
//
//   - Calendar: a test for `xs`, which opens a scope at `sm`. Only a `size` or
//     a scope sets `xs`, and the server reads both, so the first paint is right.
//   - GridData: the virtualizer estimate, the autosizer refit key, and the
//     step of the overlays that the grid opens.
//   - The docs playground: the step of the page, to mark the option of a
//     `size` field that the omitted prop renders. The docs app only.
//   - The density primitive and its barrel: `useDensityStep` itself.
//
// The check reads each name, not only each call, so an aliased import fails it.

const STEP_READERS = [
	'components/calendar/calendar.tsx',
	'docs/kit/playground.tsx',
	'modules/grid/grid-data.tsx',
	'primitives/density/density.tsx',
	'primitives/density/index.ts',
]

const STEP_READ = /\buse(?:Density)?Step\b/

// `useDensityScope` gives the nearest explicit scope, or `null` at the root.
// `Portal` writes that scope on its host, so a portaled panel keeps the step of
// the tree that opened it. Only `Portal` and the primitive may read it. A
// surface that portals goes through `Portal`, and writes no scope of its own.

const SCOPE_READERS = [
	'primitives/density/density.tsx',
	'primitives/density/index.ts',
	'primitives/portal/portal.tsx',
]

const SCOPE_READ = /\buseDensityScope\b/

describe('density readers', () => {
	it('only the listed files read the density step in JS', () => {
		expect(filesMatching(STEP_READ)).toEqual(STEP_READERS)
	})

	it('only the portal reads the nearest density scope', () => {
		expect(filesMatching(SCOPE_READ)).toEqual(SCOPE_READERS)
	})
})
