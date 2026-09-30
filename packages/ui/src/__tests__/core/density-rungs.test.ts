// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { type CssInJs, maxDepth, rungs } from '../../core/density/rungs'

const body: CssInJs = { padding: '1rem' }

/**
 * The selector list of the rung at `depth`, one selector for each entry. It
 * splits the list only at a comma outside parentheses.
 */
function selectorsAt(layers: CssInJs, depth: number): string[] {
	const layer = layers[`@layer density-${depth}`] as CssInJs

	const [list = ''] = Object.keys(layer)

	const selectors: string[] = []

	let open = 0

	let start = 0

	for (let index = 0; index < list.length; index++) {
		if (list[index] === '(') open++
		else if (list[index] === ')') open--
		else if (list[index] === ',' && open === 0) {
			selectors.push(list.slice(start, index).trim())

			start = index + 1
		}
	}

	selectors.push(list.slice(start).trim())

	return selectors
}

describe('rungs', () => {
	it('writes the root layer first, then one layer for each depth up to maxDepth', () => {
		const layers = rungs(['md'], body)

		expect(Object.keys(layers)).toEqual(
			Array.from({ length: maxDepth + 1 }, (_, depth) => `@layer density-${depth}`),
		)
	})

	it('gives md the bare base rung at the root, with no root class', () => {
		const layers = rungs(['md'], body)

		expect(layers['@layer density-0']).toEqual({ '&': body })
	})

	it('gives a marked step the rung of its root class and no base rung', () => {
		const layers = rungs(['lg'], body)

		expect(layers['@layer density-0']).toEqual({ '.density-root-lg &': body })
	})

	it('gives a group of steps the base rung and one root rung for each marked step', () => {
		const layers = rungs(['sm', 'md'], body)

		expect(layers['@layer density-0']).toEqual({ '&': body, '.density-root-sm &': body })
	})

	it('names one step with a plain attribute selector', () => {
		const [descendant, self] = selectorsAt(rungs(['xl'], body), 1)

		expect(descendant).toBe("[data-density='xl'] &")

		expect(self).toBe("&[data-density='xl']")
	})

	it('names a group of steps with the attribute outside its :is()', () => {
		const [descendant] = selectorsAt(rungs(['sm', 'md'], body), 1)

		expect(descendant).toBe("[data-density]:is([data-density='sm'], [data-density='md']) &")
	})

	it('writes one more scope above the step at each depth', () => {
		const layers = rungs(['xl'], body)

		expect(selectorsAt(layers, 2).slice(0, 2)).toEqual([
			"[data-density] [data-density='xl'] &",
			"[data-density] &[data-density='xl']",
		])

		expect(selectorsAt(layers, 3).slice(0, 2)).toEqual([
			"[data-density] [data-density] [data-density='xl'] &",
			"[data-density] [data-density] &[data-density='xl']",
		])
	})

	it('writes no slot rung for a step that no host steps down to', () => {
		const layers = rungs(['xl'], body)

		for (let depth = 1; depth <= maxDepth; depth++) {
			expect(selectorsAt(layers, depth)).toHaveLength(2)
		}
	})

	it('gives a slot under the unmarked root the step below md', () => {
		const first = selectorsAt(rungs(['sm'], body), 1)

		const root =
			':where(:root:not(.density-root-xs, .density-root-sm, .density-root-lg, .density-root-xl))'

		expect(first.slice(2)).toEqual([
			`${root} [data-density='slot'] &`,
			`${root} &[data-density='slot']`,
		])
	})

	it('gives a slot under each marked root the step below its host', () => {
		// xs is the step below xs and below sm.
		const first = selectorsAt(rungs(['xs'], body), 1)

		expect(first.slice(2)).toEqual([
			":where(.density-root-xs) [data-density='slot'] &",
			":where(.density-root-xs) &[data-density='slot']",
			":where(.density-root-sm) [data-density='slot'] &",
			":where(.density-root-sm) &[data-density='slot']",
		])
	})

	it('gives a slot under a deeper scope the step below the host scope', () => {
		const layers = rungs(['md'], body)

		expect(selectorsAt(layers, 2).slice(2)).toEqual([
			"[data-density='lg'] [data-density='slot'] &",
			"[data-density='lg'] &[data-density='slot']",
		])

		expect(selectorsAt(layers, 3).slice(2)).toEqual([
			"[data-density] [data-density='lg'] [data-density='slot'] &",
			"[data-density] [data-density='lg'] &[data-density='slot']",
		])
	})

	it('names a group of hosts with the attribute outside its :is()', () => {
		const [, , descendant] = selectorsAt(rungs(['xs'], body), 2)

		expect(descendant).toBe(
			"[data-density]:is([data-density='xs'], [data-density='sm']) [data-density='slot'] &",
		)
	})

	it('holds the body in each rung', () => {
		const layers = rungs(['md'], body)

		for (let depth = 1; depth <= maxDepth; depth++) {
			expect(Object.values(layers[`@layer density-${depth}`] as CssInJs)).toEqual([body])
		}
	})
})
