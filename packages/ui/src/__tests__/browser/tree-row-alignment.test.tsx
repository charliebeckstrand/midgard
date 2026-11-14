import { describe, expect, it } from 'vitest'
import { Tree, TreeItem } from '../../components/tree'
import { DensityProvider } from '../../providers/density'
import { present, renderUI, screen } from '../helpers'

/**
 * The labels of a Tree line up at each density step. Each row starts with the
 * chevron column, then the row gap, then the label. A nested group adds one
 * level of `narabi.nest`, the column plus the gap, so a child label starts one
 * level after the label of its parent. The file runs in the real browser,
 * because jsdom has no layout.
 */
describe('Tree row alignment (real browser)', () => {
	/** The left edge of the text of a label. */
	const labelStart = (name: string) =>
		present(screen.getByText(name), name).getBoundingClientRect().left

	it.each(['compact', 'snug', 'loose'] as const)(
		'puts a child label one level after its parent in a %s scope',
		(density) => {
			renderUI(
				<DensityProvider density={density}>
					<Tree aria-label="Files">
						<TreeItem label="src" defaultOpen>
							<TreeItem label="a.ts" />
						</TreeItem>
						<TreeItem label="README.md" />
					</Tree>
				</DensityProvider>,
			)

			const parent = labelStart('src')
			const child = labelStart('a.ts')

			expect(labelStart('README.md')).toBe(parent)

			const row = present(screen.getByText('src').closest('[role="treeitem"]'), 'src row')

			const padding = Number.parseFloat(getComputedStyle(row).paddingInlineStart)

			// One level equals the distance from the content edge of a top-level row
			// to its label: the chevron column and the row gap.
			expect(child - parent).toBe(parent - (row.getBoundingClientRect().left + padding))
		},
	)
})
