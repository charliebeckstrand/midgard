import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Tree, TreeItem } from '../../components/tree'
import { renderUI, screen } from '../helpers'

/**
 * Under `mount="lazy"` or `"always"`, a closed branch holds its items at
 * `display: none`. Roving skips them. Before, it counted them, so ArrowDown
 * from a closed branch and End moved focus to an item that cannot take focus,
 * and focus stayed where it was (B08-C04).
 *
 * Rides the real browser because jsdom does not apply the `display: none` of a
 * hidden Activity to focus.
 */
describe('Tree roving over held branches (real browser)', () => {
	for (const mount of ['lazy', 'always'] as const) {
		it(`skips the items of a closed branch under mount="${mount}"`, async () => {
			renderUI(
				<Tree aria-label="Files" mount={mount}>
					<TreeItem label="src" defaultOpen>
						<TreeItem label="a.ts" />
						<TreeItem label="b.ts" />
					</TreeItem>
					<TreeItem label="README" />
				</Tree>,
			)

			// A held item is hidden, so the query takes hidden items too.
			const item = (name: string) =>
				screen.getByRole('treeitem', { name: new RegExp(name), hidden: true })

			const src = item('src')

			src.focus()

			// Close the branch and let its held group come to rest.
			await userEvent.keyboard('{ArrowLeft}')

			await expect.poll(() => item('a.ts').checkVisibility()).toBe(false)

			await userEvent.keyboard('{ArrowDown}')

			expect(document.activeElement).toBe(item('README'))

			src.focus()

			await userEvent.keyboard('{End}')

			expect(document.activeElement).toBe(item('README'))

			await userEvent.keyboard('{ArrowUp}')

			expect(document.activeElement).toBe(src)
		})
	}
})
