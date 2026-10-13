import { describe, expect, it } from 'vitest'
import { Tree, TreeItem } from '../../../components/tree'
import { ReducedMotionContext } from '../../../primitives/reduced-motion/context'
import { fireEvent, present, renderUI, screen, waitFor } from '../../helpers'

/**
 * Under the default `mount="active"`, a closed Tree group stays on screen for
 * its 200 ms exit, and `AnimatePresence` keeps the rows of the last open
 * render. Under reduced motion the height snaps, but the fade runs. Roving must
 * not move focus to a row of the exiting group, because the group then unmounts
 * and focus falls to the body.
 *
 * Real Motion is necessary: the instant mock removes the group in the commit
 * that closes it, so no exit occurs.
 *
 * The keys go through `fireEvent`, not `userEvent`. Each `userEvent` key is a
 * round trip to the browser process, and under load two round trips can take
 * more time than the exit.
 */
function renderTree(reduced = false) {
	renderUI(
		<ReducedMotionContext value={reduced}>
			<Tree aria-label="Files">
				<TreeItem label="src" defaultOpen>
					<TreeItem label="a.ts" />
					<TreeItem label="b.ts" />
				</TreeItem>
				<TreeItem label="README" />
			</Tree>
		</ReducedMotionContext>,
	)

	const branch = screen.getByRole('treeitem', { name: 'src' })

	const group = groupOf(branch)

	return {
		branch,
		group,
		child: screen.getByRole('treeitem', { name: 'a.ts' }),
		last: screen.getByRole('treeitem', { name: 'README' }),
	}
}

/** The group that a branch row owns. */
function groupOf(branch: HTMLElement) {
	return present(document.getElementById(branch.getAttribute('aria-owns') ?? ''), 'group')
}

function press(key: string) {
	fireEvent.keyDown(present(document.activeElement, 'focused row'), { key })
}

describe('Tree exiting group (real Motion)', () => {
	it.each([
		{ reduced: false, name: 'the full exit' },
		{ reduced: true, name: 'the reduced exit' },
	])('moves focus past the rows of a closing group under $name', async ({ reduced }) => {
		const { branch, group, child, last } = renderTree(reduced)

		branch.focus()

		press('ArrowLeft')

		expect(branch).toHaveAttribute('aria-expanded', 'false')

		// The group stays for its exit, and its rows stay with it.
		expect(group).toBeInTheDocument()

		expect(group).toContainElement(child)

		press('ArrowDown')

		expect(document.activeElement).toBe(last)

		expect(group).toHaveAttribute('inert')

		await waitFor(() => expect(group).not.toBeInTheDocument())

		expect(document.activeElement).toBe(last)
	})

	it('clears the mark when the branch opens again during the exit', () => {
		const { branch, group, child } = renderTree()

		branch.focus()

		press('ArrowLeft')

		expect(group).toHaveAttribute('inert')

		press('ArrowRight')

		// The open keeps the same node, so the mark must go.
		expect(groupOf(branch)).toBe(group)

		expect(group).not.toHaveAttribute('inert')

		press('ArrowDown')

		expect(document.activeElement).toBe(child)
	})
})
