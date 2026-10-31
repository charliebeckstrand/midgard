import { describe, expect, it } from 'vitest'
import { JsonTree } from '../../../components/json-tree'
import { ReducedMotionContext } from '../../../primitives/reduced-motion/context'
import { present, renderUI, waitFor } from '../../helpers'
import { EXIT_MOTION_CASES, getGroup, pressKey } from '../helpers/exit'

/**
 * A closed JsonTree group stays on screen for its 200 ms exit, and
 * `AnimatePresence` keeps the rows of the last open render. Under reduced
 * motion the height snaps, but the fade runs. Roving must not move focus to a
 * row of the exiting group, because the group then unmounts and focus falls
 * to the body.
 *
 * Real Motion is necessary: the instant mock removes the group in the commit
 * that closes it, so no exit occurs.
 *
 * The keys go through `fireEvent`, not `userEvent`. Each `userEvent` key is a
 * round trip to the browser process, and under load two round trips can take
 * more time than the exit.
 */
const data = { a: { x: 1, y: 2 }, b: 3 }

function rows(container: HTMLElement) {
	const [root, branch, x, y, last] = Array.from(
		container.querySelectorAll<HTMLElement>('[role="treeitem"]'),
	)

	return {
		root: present(root, 'root row'),
		branch: present(branch, 'row a'),
		x: present(x, 'row x'),
		y: present(y, 'row y'),
		last: present(last, 'row b'),
	}
}

describe('JsonTree exiting group (real Motion)', () => {
	it.each(EXIT_MOTION_CASES)(
		'moves focus past the rows of a closing group under $name',
		async ({ reduced }) => {
			const { container } = renderUI(
				<ReducedMotionContext value={reduced}>
					<JsonTree data={data} defaultExpandDepth={2} />
				</ReducedMotionContext>,
			)

			const { branch, x, last } = rows(container)

			const group = getGroup(branch)

			branch.focus()

			pressKey('ArrowLeft')

			expect(branch).toHaveAttribute('aria-expanded', 'false')

			// The group stays for its exit, and its rows stay with it.
			expect(group).toBeInTheDocument()

			expect(group).toContainElement(x)

			pressKey('ArrowDown')

			expect(document.activeElement).toBe(last)

			expect(group).toHaveAttribute('inert')

			await waitFor(() => expect(group).not.toBeInTheDocument())

			expect(document.activeElement).toBe(last)
		},
	)

	it('clears the mark when the branch opens again during the exit', () => {
		const { container } = renderUI(<JsonTree data={data} defaultExpandDepth={2} />)

		const { branch, x } = rows(container)

		const group = getGroup(branch)

		branch.focus()

		pressKey('ArrowLeft')

		expect(group).toHaveAttribute('inert')

		pressKey('ArrowRight')

		// The open keeps the same node, so the mark must go.
		expect(getGroup(branch)).toBe(group)

		expect(group).not.toHaveAttribute('inert')

		pressKey('ArrowDown')

		expect(document.activeElement).toBe(x)
	})
})
