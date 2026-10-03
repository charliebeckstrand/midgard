import { describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { JsonTree } from '../../components/json-tree'
import { Tree, TreeItem } from '../../components/tree'
import { renderUI } from '../helpers'

/**
 * An open branch row of a Tree or a JsonTree owns its child group through
 * `aria-owns`, and `aria-labelledby` keeps the text of the owned group out of
 * the name of the row.
 *
 * Rides the real browser for the accessible name that the browser engine
 * computes, which reads the owned group as a child of the row.
 */
describe('tree group ownership (real browser)', () => {
	it('names an open Tree row from its label alone', async () => {
		renderUI(
			<Tree aria-label="Files">
				<TreeItem label="src" defaultOpen suffix={<span>3 files</span>}>
					<TreeItem label="a.ts" />
				</TreeItem>
			</Tree>,
		)

		await expect
			.element(page.getByRole('treeitem', { name: 'src', exact: true }))
			.toHaveAttribute('aria-expanded', 'true')

		await expect.element(page.getByRole('treeitem', { name: 'a.ts', exact: true })).toBeVisible()
	})

	it('keeps the text of the owned group out of an open JsonTree row', async () => {
		renderUI(<JsonTree data={{ user: { name: 'Ada' } }} rootKey="payload" defaultExpandDepth={5} />)

		await expect.element(page.getByRole('treeitem', { name: /"name"/ })).toBeVisible()

		// Only the leaf row holds "Ada". The open branch rows own the groups that
		// hold the leaf, and their names leave the text of those groups out.
		expect(page.getByRole('treeitem', { name: /Ada/ }).elements()).toHaveLength(1)

		expect(page.getByRole('treeitem', { name: /"user"/ }).elements()).toHaveLength(1)
	})
})
