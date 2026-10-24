import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Tree, TreeItem } from '../../../components/tree'
import { present, renderUI, screen } from '../../helpers'
import { sampleMotionFrames } from '../helpers/motion-frame'
import { budget } from '../helpers/wall-clock'

/**
 * The tree removes the bottom padding of its last visible row. When the last
 * branch opens or closes, only the height of its group moves. The row of the
 * branch keeps its box, and the rows in the group keep their place below it.
 * Thus a closing group does not jump up at the start of its exit, and the edge
 * of the tree does not jump at the start of an open or at the end of a close.
 *
 * Real Motion is necessary: the instant mock lands each target at once.
 */

/** One frame: the box of the branch row, the child row, and the group. */
type Sample = {
	/** The bottom of the tree less the top of the branch row and the height of the group. */
	rest: number
	/** The top of the child row less the top of the branch row, or null when the group does not show. */
	child: number | null
	/** The height of the group, or 0 when the group does not show. */
	group: number
	/** The computed overflow of the group, or null when the group does not show. */
	overflow: string | null
}

function read(): Sample {
	const tree = present(document.querySelector('[data-slot="tree"]'), 'tree')

	const row = screen.getByRole('treeitem', { name: 'src' }).getBoundingClientRect()

	const group = document.querySelector<HTMLElement>('[data-slot="tree-group"]')

	const shown = group !== null && group.getClientRects().length > 0

	const height = shown ? group.getBoundingClientRect().height : 0

	const child = shown ? screen.getByText('a.ts').closest('[role="treeitem"]') : null

	return {
		rest: tree.getBoundingClientRect().bottom - row.top - height,
		child: child ? child.getBoundingClientRect().top - row.top : null,
		group: height,
		overflow: shown ? getComputedStyle(group).overflow : null,
	}
}

/** Reads each frame from the toggle until the group lands. */
async function toggle(landed: (sample: Sample) => boolean): Promise<Sample[]> {
	const samples: Sample[] = []

	await sampleMotionFrames(
		() => {
			const sample = read()

			samples.push(sample)

			return sample
		},
		landed,
		{
			deadline: budget(5000),
			during: () => userEvent.click(screen.getByRole('treeitem', { name: 'src' })),
		},
	)

	return samples
}

describe.each(['active', 'always'] as const)('Tree last branch motion (mount %s)', (mount) => {
	const renderTree = (defaultOpen: boolean) =>
		renderUI(
			<Tree aria-label="Files" mount={mount}>
				<TreeItem label="README.md" />
				<TreeItem label="src" defaultOpen={defaultOpen}>
					<TreeItem label="a.ts" />
				</TreeItem>
			</Tree>,
		)

	it('moves only the group height as the branch closes', async () => {
		renderTree(true)

		const before = read()

		const offset = before.child

		if (offset === null) throw new Error('expected the child row before the close')

		const samples = await toggle((sample) => sample.group === 0)

		expect(samples.some((sample) => sample.group > 0 && sample.group < before.group)).toBe(true)

		for (const sample of samples) {
			expect(sample.rest).toBeCloseTo(before.rest, 1)

			if (sample.child !== null) expect(sample.child).toBeCloseTo(offset, 1)
		}
	})

	it('moves only the group height as the branch opens', async () => {
		renderTree(false)

		const before = read()

		const samples = await toggle((sample) => sample.overflow === 'visible')

		const after = samples.at(-1)

		const offset = after?.child ?? null

		if (!after || offset === null) throw new Error('expected the child row after the open')

		expect(samples.some((sample) => sample.group > 0 && sample.group < after.group)).toBe(true)

		for (const sample of samples) {
			expect(sample.rest).toBeCloseTo(before.rest, 1)

			if (sample.child !== null) expect(sample.child).toBeCloseTo(offset, 1)
		}
	})
})
