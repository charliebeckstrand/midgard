import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Tree, TreeItem } from '../../../components/tree'
import { present, renderUI, screen } from '../../helpers'
import { sampleMotionFrames } from '../helpers/motion-frame'
import { budget } from '../helpers/wall-clock'

/**
 * A held Tree group opens on its first reveal. Under `always`, the group of a closed branch is
 * present from the start. Its `initial` must key on the state it mounted in, as
 * `heldMotionProps` does: `false` there suppresses the reveal, and the group stays at opacity 0
 * and height 0.
 *
 * Real Motion is necessary: the instant mock lands each target at once.
 */
describe('the first open of a held Tree group (real Motion)', () => {
	it.each(['lazy', 'always'] as const)('opens a closed branch under %s', async (mount) => {
		renderUI(
			<Tree aria-label="Files" mount={mount}>
				<TreeItem label="src">
					<TreeItem label="a.ts" />
				</TreeItem>
			</Tree>,
		)

		screen.getByRole('treeitem', { name: 'src' }).focus()

		await userEvent.keyboard('{ArrowRight}')

		const group = () =>
			present(document.querySelector<HTMLElement>('[data-slot="tree-group"]'), 'group')

		await sampleMotionFrames(
			() => getComputedStyle(group()).opacity,
			(opacity) => opacity === '1',
			{ deadline: budget(5000) },
		)

		expect(group().getBoundingClientRect().height).toBeGreaterThan(0)
	})
})
