// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { type CssInJs, rungs } from '../../core/density/rungs'
import { densitySteps } from '../../core/density/steps'
import { handler } from '../../core/density/utilities'
import { utilityTable } from '../../core/density/utility-table'

type Callback = (value: string) => CssInJs | CssInJs[]

type Registered = { callback: Callback; values?: Record<string, string> }

/**
 * Runs the plugin against a fake of the plugin API. The fake records each
 * utility that `matchUtilities` registers, keyed by its name.
 */
function register(): Map<string, Registered> {
	const utilities = new Map<string, Registered>()

	const matchUtilities = (
		entries: Record<string, Callback>,
		options?: { values?: Record<string, string> },
	) => {
		for (const [name, callback] of Object.entries(entries)) {
			utilities.set(name, { callback, values: options?.values })
		}
	}

	handler({ matchUtilities } as unknown as Parameters<typeof handler>[0])

	return utilities
}

const utilities = register()

/** Calls the utility `name` with `value`. */
function call(name: string, value: string): CssInJs | CssInJs[] {
	const utility = utilities.get(name)

	if (!utility) throw new Error(`no utility ${name}`)

	return utility.callback(value)
}

const spacing = (stop: string) => `calc(var(--spacing) * ${stop})`

const ring = (stop: string) => `calc(var(--spacing) * ${stop} - 1px)`

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

	it('writes the rules of the triad for three values', () => {
		expect(call('density-p', '2,3,4')).toEqual([
			rungs(['xs', 'sm'], { padding: spacing('2') }),
			rungs(['md'], { padding: spacing('3') }),
			rungs(['lg', 'xl'], { padding: spacing('4') }),
		])
	})

	it('writes one rule for each step when five values differ', () => {
		expect(call('density-gap', '1,2,3,4,5')).toEqual(
			densitySteps.map((step, index) => rungs([step], { gap: spacing(String(index + 1)) })),
		)
	})

	it('groups the steps that take the same value into one rule', () => {
		expect(call('density-px', '2, 2, 2')).toEqual([
			rungs(['xs', 'sm', 'md', 'lg', 'xl'], { 'padding-inline': spacing('2') }),
		])
	})

	it('declares each property of a utility with more than one', () => {
		expect(call('density-size', '4,4,4')).toEqual([
			rungs(['xs', 'sm', 'md', 'lg', 'xl'], { width: spacing('4'), height: spacing('4') }),
		])
	})

	it('accepts a fractional stop of the spacing scale', () => {
		expect(call('density-p', '1.5,2,2.5')).toEqual([
			rungs(['xs', 'sm'], { padding: spacing('1.5') }),
			rungs(['md'], { padding: spacing('2') }),
			rungs(['lg', 'xl'], { padding: spacing('2.5') }),
		])
	})

	it('writes the size and leading of the text scale for density-text', () => {
		expect(call('density-text', 'sm,sm,sm')).toEqual([
			rungs(['xs', 'sm', 'md', 'lg', 'xl'], {
				'font-size': 'var(--text-sm)',
				'line-height': 'var(--tw-leading, calc(var(--text-sm) + 0.5rem))',
			}),
		])
	})

	it('takes a name of the radius scale or a spacing stop for density-rounded', () => {
		expect(call('density-rounded', 'lg,lg,2')).toEqual([
			rungs(['xs', 'sm', 'md'], { 'border-radius': 'var(--radius-lg)' }),
			rungs(['lg', 'xl'], { 'border-radius': spacing('2') }),
		])
	})

	it.each([
		['a list of the wrong length', 'density-p', '2,3'],
		['a list of four values', 'density-p', '1,2,3,4'],
		['a name for a spacing utility', 'density-p', 'sm,md,lg'],
		['a negative stop', 'density-p', '-1,2,3'],
		['a fractional stop for density-text', 'density-text', '1.5,sm,lg'],
		['a value that is no name or stop', 'density-rounded', '2,3,full-x'],
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
		expect(call('px-ring', '2')).toEqual({ 'padding-inline': ring('2') })

		expect(call('rounded-ring', '1.5')).toEqual({ 'border-radius': ring('1.5') })
	})

	it('subtracts the ring from each step in the stepped ring utility', () => {
		expect(call('density-px-ring', '2,3,4')).toEqual([
			rungs(['xs', 'sm'], { 'padding-inline': ring('2') }),
			rungs(['md'], { 'padding-inline': ring('3') }),
			rungs(['lg', 'xl'], { 'padding-inline': ring('4') }),
		])
	})
})
