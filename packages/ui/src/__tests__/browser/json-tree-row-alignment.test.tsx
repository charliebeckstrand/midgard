import { describe, expect, it } from 'vitest'
import { JsonTree } from '../../components/json-tree'
import { DensityProvider } from '../../providers/density'
import { present, renderUI, screen } from '../helpers'

/**
 * The keys of a JsonTree line up at each density step. A branch row starts its key after the
 * chevron, and a leaf row starts its key after the spacer in place of the chevron, so the two boxes
 * have one width. A nested group adds one indent, which equals the spacer and the row gap, so a
 * child key starts one indent after the key of its parent. The file runs in the real browser,
 * because jsdom has no layout.
 */
describe('JsonTree row alignment (real browser)', () => {
	const data = { alpha: 1, beta: { gamma: 2 }, delta: 3 }

	/** The left edge of the text of a key. */
	const keyStart = (name: string) =>
		present(screen.getByText(`"${name}"`), name).getBoundingClientRect().left

	it.each(['compact', 'snug', 'loose'] as const)(
		'lines up the keys of a branch and a leaf in a %s scope',
		(density) => {
			renderUI(
				<DensityProvider density={density}>
					<JsonTree data={data} defaultExpandDepth={2} />
				</DensityProvider>,
			)

			const alpha = keyStart('alpha')
			const beta = keyStart('beta')
			const gamma = keyStart('gamma')
			const delta = keyStart('delta')

			expect(beta).toBe(alpha)
			expect(delta).toBe(alpha)

			const row = present(
				screen.getByText('"alpha"').closest('[role="treeitem"]'),
				'alpha row',
			).getBoundingClientRect().left

			// A child key starts one indent after its parent key, and the indent equals the
			// distance from the start of a top-level row to its key.
			expect(gamma - beta).toBe(alpha - row)
		},
	)
})
