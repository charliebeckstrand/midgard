// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { type DensityStep, densitySteps, rootDensityClasses } from '../../core/density/steps'
import { handler } from '../../core/density/utilities'
import { utilityTable } from '../../core/density/utility-table'

type CssInJs = { [key: string]: string | CssInJs }

type Callback = (value: string, extra?: { modifier: string | null }) => CssInJs | CssInJs[]

type Registered = { callback: Callback; values?: Record<string, string> }

/**
 * The keys of the theme that the fake API knows. `--radius-full` is in it, as a
 * consumer theme can hold it, so that a test sees the plugin reject `full`.
 */
const themeKeys: Record<string, string> = {
	'--text-xs': '0.75rem',
	'--text-sm': '0.875rem',
	'--text-base': '1rem',
	'--text-lg': '1.125rem',
	'--text-xl': '1.25rem',
	'--radius-sm': '0.25rem',
	'--radius-md': '0.375rem',
	'--radius-lg': '0.5rem',
	'--radius-full': 'calc(infinity * 1px)',
	'--container-2xs': '18rem',
	'--container-xs': '20rem',
	'--container-sm': '24rem',
}

/**
 * Runs the plugin against a fake of the plugin API. The fake records each
 * utility that `matchUtilities` registers, keyed by its name, and each base
 * rule that `addBase` writes. Its `theme` reads {@link themeKeys}.
 */
function register() {
	const utilities = new Map<string, Registered>()

	const base: CssInJs[] = []

	const matchUtilities = (
		entries: Record<string, Callback>,
		options?: { values?: Record<string, string> },
	) => {
		for (const [name, callback] of Object.entries(entries)) {
			utilities.set(name, { callback, values: options?.values })
		}
	}

	const addBase = (rules: CssInJs) => base.push(rules)

	const theme = (key: string) => themeKeys[key]

	handler({ addBase, matchUtilities, theme } as unknown as Parameters<typeof handler>[0])

	return { utilities, base }
}

const { utilities, base } = register()

/**
 * Calls the utility `name` with `value` and `modifier`, as Tailwind gives them:
 * with no brackets on an arbitrary modifier, and `null` for no modifier.
 */
function call(name: string, value: string, modifier: string | null = null): CssInJs | CssInJs[] {
	const utility = utilities.get(name)

	if (!utility) throw new Error(`no utility ${name}`)

	return utility.callback(value, { modifier })
}

/** The declarations of the one rule that the stepped utility `name` writes for `value`. */
function rule(name: string, value: string, modifier: string | null = null): CssInJs {
	const rules = call(name, value, modifier)

	expect(rules).toHaveLength(1)

	const [only] = rules as CssInJs[]

	expect(Object.keys(only ?? {})).toEqual(['@layer density'])

	return only?.['@layer density'] as CssInJs
}

/** The value of the one property that the stepped utility `name` writes for `value`. */
function declaration(name: string, value: string, property: string): string {
	return rule(name, value)[property] as string
}

/**
 * Reads a sum of numbers, `+`, `-`, `*`, and parentheses. A test gives the
 * weights and the theme keys as numbers first, so the sum is plain arithmetic.
 */
function evaluate(expression: string): number {
	const tokens = expression.match(/\d+(?:\.\d+)?|[-+*()]/g) ?? []

	let index = 0

	const next = () => tokens[index++]

	const peek = () => tokens[index]

	const factor = (): number => {
		const token = next()

		if (token === '-') return -factor()

		if (token === '(') {
			const value = sum()

			next()

			return value
		}

		return Number(token)
	}

	const product = (): number => {
		let value = factor()

		while (peek() === '*') {
			next()

			value *= factor()
		}

		return value
	}

	const sum = (): number => {
		let value = product()

		while (peek() === '+' || peek() === '-') {
			value += next() === '+' ? product() : -product()
		}

		return value
	}

	return sum()
}

/**
 * The value of `css` at `step`: each weight is 1 for `step` and 0 for each
 * other step, `--spacing` is 1, and each theme key takes its value in rem.
 */
function at(css: string, step: DensityStep): number {
	const numbers = css
		.replace(/var\(--ui-d(\w+)\)/g, (_, other) => (other === step ? '1' : '0'))
		.replace(/var\(--spacing\)/g, '1')
		.replace(/var\((--[\w-]+)\)/g, (_, key) => String(Number.parseFloat(themeKeys[key] ?? 'NaN')))
		.replace(/calc/g, '')

	return evaluate(numbers)
}

/** The value of `css` at each step. */
const atEachStep = (css: string) => densitySteps.map((step) => at(css, step))

describe('the base rules of the density scopes', () => {
	const [rules] = base as [CssInJs]

	/** The weights that a scope at `step` sets: 1 for its step, and 0 for each other step. */
	const getWeights = (step: DensityStep) =>
		Object.fromEntries(
			densitySteps.flatMap((other) => [
				[`--ui-d${other}`, other === step ? '1' : '0'],
				[`--ui-h${other}`, other === step ? '1' : '0'],
			]),
		)

	it('writes one set of base rules', () => {
		expect(base).toHaveLength(1)
	})

	it('gives the root md, with no mark', () => {
		expect(rules[':root']).toEqual(getWeights('md'))
	})

	it('gives each step its root class and its data-density scope', () => {
		for (const step of densitySteps) {
			const attribute = `[data-density='${step}']`

			const mark = (rootDensityClasses as Partial<Record<DensityStep, string>>)[step]

			const selector = mark ? `:root.${mark}, ${attribute}` : attribute

			expect(rules[selector]).toEqual(getWeights(step))
		}
	})

	it('sets md again in a data-density md scope', () => {
		expect(rules["[data-density='md']"]).toEqual(getWeights('md'))
	})

	it('steps a slot one step below the host weights, and sets no host weight', () => {
		expect(rules["[data-density='slot']"]).toEqual({
			'--ui-dxs': 'calc(var(--ui-hxs) + var(--ui-hsm))',
			'--ui-dsm': 'var(--ui-hmd)',
			'--ui-dmd': 'var(--ui-hlg)',
			'--ui-dlg': 'var(--ui-hxl)',
			'--ui-dxl': '0',
		})
	})

	it('writes no other rule', () => {
		expect(Object.keys(rules)).toHaveLength(densitySteps.length + 2)
	})
})

describe('density utilities', () => {
	it('registers a stepped utility for each entry of the table', () => {
		for (const name of Object.keys(utilityTable)) {
			expect(utilities.has(`density-${name}`)).toBe(true)
		}
	})

	it('registers the ring forms only for an entry with ring', () => {
		for (const [name, entry] of Object.entries(utilityTable)) {
			const hasRing = 'ring' in entry

			expect(utilities.has(`${name}-ring`)).toBe(hasRing)

			expect(utilities.has(`density-${name}-ring`)).toBe(hasRing)
		}
	})

	it('writes one rule in the layer density for three values', () => {
		expect(call('density-p', '2,3,4')).toEqual([
			{
				'@layer density': {
					padding:
						'calc(var(--spacing) * (2 + var(--ui-dmd) + 2 * (var(--ui-dlg) + var(--ui-dxl))))',
				},
			},
		])
	})

	it('gives the outer steps of three values the value of their neighbor', () => {
		expect(atEachStep(declaration('density-p', '1.5,2,2.5', 'padding'))).toEqual([
			1.5, 1.5, 2, 2.5, 2.5,
		])
	})

	it('writes a term for each step that differs from the most frequent value', () => {
		const padding = declaration('density-gap', '1,2,3,4,5', 'gap')

		expect(padding).toBe(
			'calc(var(--spacing) * (3 - 2 * var(--ui-dxs) - var(--ui-dsm) + var(--ui-dlg) + 2 * var(--ui-dxl)))',
		)

		expect(atEachStep(padding)).toEqual([1, 2, 3, 4, 5])
	})

	it.each([
		['0.25,0.5,1,1.5,2.5'],
		['0.5,1,2,3,4.5'],
		['2,4,6,8,10'],
		['3,3.5,4,4.5,5'],
		['0,0,1,2,2'],
		['4,5,6,7,8'],
	])('gives each step of %s its own value', (list) => {
		expect(atEachStep(declaration('density-p', list, 'padding'))).toEqual(
			list.split(',').map(Number),
		)
	})

	it('groups the steps that take the same difference into one term', () => {
		expect(declaration('density-h', '6,6,8,10,10', 'height')).toBe(
			'calc(var(--spacing) * (6 + 2 * var(--ui-dmd) + 4 * (var(--ui-dlg) + var(--ui-dxl))))',
		)
	})

	it('writes a plain stop when each step has the same value', () => {
		expect(rule('density-px', '2, 2, 2')).toEqual({ 'padding-inline': 'calc(var(--spacing) * 2)' })
	})

	it('declares each property of a utility with more than one', () => {
		const declarations = rule('density-size', '4,5,6')

		expect(Object.keys(declarations)).toEqual(['width', 'height'])

		expect(declarations.width).toBe(declarations.height)
	})

	it('takes negative stops for a margin', () => {
		const margin = declaration('density-mb', '-3,-4,-5', 'margin-bottom')

		expect(margin).toBe(
			'calc(var(--spacing) * (-3 - var(--ui-dmd) - 2 * (var(--ui-dlg) + var(--ui-dxl))))',
		)

		expect(atEachStep(margin)).toEqual([-3, -3, -4, -5, -5])
	})

	it.each(['density-ms', 'density-me', 'density-mx'])('takes negative stops for %s', (name) => {
		expect(call(name, '-1,-2,-3')).toHaveLength(1)
	})

	it('takes the names of the container scale and spacing stops for density-w', () => {
		const width = declaration('density-w', '2xs,xs,sm', 'width')

		expect(width).toBe(
			'calc(var(--container-2xs) * (var(--ui-dxs) + var(--ui-dsm)) + var(--container-xs) * var(--ui-dmd) + var(--container-sm) * (var(--ui-dlg) + var(--ui-dxl)))',
		)

		expect(atEachStep(width)).toEqual([18, 18, 20, 24, 24])

		expect(atEachStep(declaration('density-w', '64,72,80', 'width'))).toEqual([64, 64, 72, 80, 80])
	})

	it('sets the custom property of its modifier for density-set', () => {
		const declarations = rule('density-set', '4,5,6,7,8', '--ui-panel-bottom')

		expect(Object.keys(declarations)).toEqual(['--ui-panel-bottom'])

		const length = declarations['--ui-panel-bottom'] as string

		expect(length).toBe(
			'calc(var(--spacing) * (6 - 2 * var(--ui-dxs) - var(--ui-dsm) + var(--ui-dlg) + 2 * var(--ui-dxl)))',
		)

		expect(atEachStep(length)).toEqual([4, 5, 6, 7, 8])
	})

	it('takes three values and negative stops for density-set', () => {
		expect(atEachStep(rule('density-set', '1,2,3', '--gap')['--gap'] as string)).toEqual([
			1, 1, 2, 3, 3,
		])

		expect(rule('density-set', '-0.5,-0.5,-1,-1,-1', '--ui-avatar-overlap')).toEqual({
			'--ui-avatar-overlap': 'calc(var(--spacing) * (-1 + 0.5 * (var(--ui-dxs) + var(--ui-dsm))))',
		})

		expect(rule('density-set', '2,2,2', '--gap')).toEqual({ '--gap': 'calc(var(--spacing) * 2)' })
	})

	it('takes a modifier in brackets for density-set', () => {
		expect(rule('density-set', '1,2,3', '[--gap]')).toEqual(rule('density-set', '1,2,3', '--gap'))
	})

	it.each([
		['no modifier', null],
		['an empty modifier', ''],
		['a named modifier', 'gap'],
		['a CSS property', 'padding'],
		['a var() of a custom property', 'var(--gap)'],
		['a custom property with no name', '--'],
		['a custom property with a space', '--a b'],
		['a declaration', '--gap:1px'],
		['a weight', '--ui-dmd'],
		['a host weight', '--ui-hxs'],
		['the spacing unit', '--spacing'],
		['a property of Tailwind', '--tw-space-x-reverse'],
	])('writes no CSS for density-set with %s', (_, modifier) => {
		expect(call('density-set', '1,2,3', modifier)).toEqual([])
	})

	it.each([
		['a name', 'sm,md,lg'],
		['a list of four values', '1,2,3,4'],
		['a list of two values', '1,2'],
	])('writes no CSS for density-set with %s and a custom property', (_, value) => {
		expect(call('density-set', value, '--gap')).toEqual([])
	})

	it('writes the size and leading of the text scale for density-text', () => {
		const declarations = rule('density-text', 'xs,sm,base')

		const size =
			'var(--text-xs) * (var(--ui-dxs) + var(--ui-dsm)) + var(--text-sm) * var(--ui-dmd) + var(--text-base) * (var(--ui-dlg) + var(--ui-dxl))'

		expect(declarations).toEqual({
			'font-size': `calc(${size})`,
			'line-height': `var(--tw-leading, calc(${size} + 0.5rem))`,
		})

		expect(atEachStep(declarations['font-size'] as string)).toEqual([0.75, 0.75, 0.875, 1, 1])
	})

	it('writes the theme key of one text size with no calc', () => {
		expect(rule('density-text', 'sm,sm,sm')).toEqual({
			'font-size': 'var(--text-sm)',
			'line-height': 'var(--tw-leading, calc(var(--text-sm) + 0.5rem))',
		})
	})

	it('takes a name of the radius scale and a spacing stop in one list for density-rounded', () => {
		const radius = declaration('density-rounded', 'lg,lg,2', 'border-radius')

		expect(radius).toBe(
			'calc(var(--radius-lg) * (var(--ui-dxs) + var(--ui-dsm) + var(--ui-dmd)) + calc(var(--spacing) * 2) * (var(--ui-dlg) + var(--ui-dxl)))',
		)

		expect(atEachStep(radius)).toEqual([0.5, 0.5, 0.5, 2, 2])
	})

	it('writes the stops of a radius with only stops as one sum', () => {
		expect(atEachStep(declaration('density-rounded', '1,1.5,2,2.5,3', 'border-radius'))).toEqual([
			1, 1.5, 2, 2.5, 3,
		])
	})

	it.each([
		['a list of the wrong length', 'density-p', '2,3'],
		['a list of four values', 'density-p', '1,2,3,4'],
		['a name for a spacing utility', 'density-p', 'sm,md,lg'],
		['a negative stop', 'density-p', '-1,2,3'],
		['a fractional stop for density-text', 'density-text', '1.5,sm,lg'],
		['a text name that is not in the theme', 'density-text', 'sm,base,huge'],
		['a value that is no name or stop', 'density-rounded', '2,3,full-x'],
		['a radius name that is not in the theme', 'density-rounded', 'sm,md,none'],
		['the full radius', 'density-rounded', 'md,lg,full'],
		['a container name that is not in the theme', 'density-w', 'auto,xs,sm'],
		['a negative width', 'density-w', '-1,2,3'],
		['a ring stop out of range', 'density-p-ring', '2,3,9'],
		['a ring stop off the quarter grid', 'density-p-ring', '2,3,1.3'],
	])('writes no CSS for %s', (_, name, value) => {
		expect(call(name, value)).toEqual([])
	})

	it('gives the ring utility each quarter stop from 0.25 to 8', () => {
		const values = utilities.get('p-ring')?.values ?? {}

		expect(Object.keys(values)).toHaveLength(32)

		expect(values['0.25']).toBe('0.25')

		expect(values['8']).toBe('8')

		expect(values['0']).toBeUndefined()
	})

	it('subtracts the ring from a stop in the plain ring utility', () => {
		expect(call('px-ring', '2')).toEqual({ 'padding-inline': 'calc(var(--spacing) * 2 - 1px)' })

		expect(call('rounded-ring', '1.5')).toEqual({
			'border-radius': 'calc(var(--spacing) * 1.5 - 1px)',
		})
	})

	it('subtracts the ring one time from the sum in the stepped ring utility', () => {
		const padding = declaration('density-px-ring', '2,3,4', 'padding-inline')

		expect(padding).toBe(
			'calc(var(--spacing) * (2 + var(--ui-dmd) + 2 * (var(--ui-dlg) + var(--ui-dxl))) - 1px)',
		)

		expect(rule('density-px-ring', '2,2,2')).toEqual({
			'padding-inline': 'calc(var(--spacing) * 2 - 1px)',
		})
	})
})
