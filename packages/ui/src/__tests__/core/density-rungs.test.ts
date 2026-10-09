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

	it('names the scopes in :where(), with the attribute outside it', () => {
		expect(selectorsAt(rungs(['xl'], body), 1)).toEqual([
			"[data-density]:where([data-density='xl']) &",
		])
	})

	it('names a group of steps with :is()', () => {
		const [descendant] = selectorsAt(rungs(['lg', 'xl'], body), 1)

		expect(descendant).toBe(
			"[data-density]:where(:is([data-density='lg'], [data-density='xl']), .density-root-xl [data-density='slot']) &",
		)
	})

	it('writes one more scope above the step at each depth', () => {
		const layers = rungs(['xl'], body)

		expect(selectorsAt(layers, 1)[0]).toBe("[data-density]:where([data-density='xl']) &")

		expect(selectorsAt(layers, 2)[0]).toBe(
			"[data-density]:where([data-density] [data-density='xl']) &",
		)
	})

	it('writes the rung of the scope element once, in the layer of the deepest depth', () => {
		const layers = rungs(['xl'], body)

		for (let depth = 1; depth < maxDepth; depth++) {
			expect(selectorsAt(layers, depth)).not.toContain("&[data-density='xl']")
		}

		expect(selectorsAt(layers, maxDepth).at(-1)).toBe("&[data-density='xl']")

		expect(selectorsAt(rungs(['xs', 'sm'], body), maxDepth).at(-1)).toBe(
			"&:is([data-density='xs'], [data-density='sm'])",
		)
	})

	// A slot does not take `xl`: no step is above `xl`, so no host has `xl` as its slot step.
	it('writes no slot rung for xl, a step that no slot takes', () => {
		const layers = rungs(['xl'], body)

		for (let depth = 1; depth <= maxDepth; depth++) {
			for (const selector of selectorsAt(layers, depth)) expect(selector).not.toContain('slot')
		}
	})

	it('gives a slot under the unmarked root the step below md', () => {
		const [descendant, self] = selectorsAt(rungs(['sm'], body), 1)

		const root = ':root:not(.density-root-xs, .density-root-sm, .density-root-lg, .density-root-xl)'

		expect(descendant).toBe(
			`[data-density]:where([data-density='sm'], ${root} [data-density='slot']) &`,
		)

		expect(self).toBe(`:where(${root}) &[data-density='slot']`)
	})

	it('gives a slot under each marked root the step below its host', () => {
		// xs is the step below xs and below sm.
		const [descendant, self] = selectorsAt(rungs(['xs'], body), 1)

		const root = ':is(.density-root-xs, .density-root-sm)'

		expect(descendant).toBe(
			`[data-density]:where([data-density='xs'], ${root} [data-density='slot']) &`,
		)

		expect(self).toBe(`:where(${root}) &[data-density='slot']`)
	})

	it('names the unmarked root by the marks that it does not hold', () => {
		// The slots of xs, sm, and md take xs or sm.
		const [, self] = selectorsAt(rungs(['xs', 'sm'], body), 1)

		expect(self).toBe(
			":where(:root:not(.density-root-lg, .density-root-xl)) &[data-density='slot']",
		)
	})

	it('gives a slot under a deeper scope the step below the host scope', () => {
		const layers = rungs(['md'], body)

		// A slot takes `md` under `lg`.
		const hosts = "[data-density='lg']"

		expect(selectorsAt(layers, 2).slice(0, 2)).toEqual([
			`[data-density]:where([data-density] [data-density='md'], ${hosts} [data-density='slot']) &`,
			`:where(${hosts}) &[data-density='slot']`,
		])
	})

	it('holds the body in each rung', () => {
		const layers = rungs(['md'], body)

		for (let depth = 1; depth <= maxDepth; depth++) {
			expect(Object.values(layers[`@layer density-${depth}`] as CssInJs)).toEqual([body])
		}
	})
})
