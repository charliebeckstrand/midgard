import { describe, expect, it } from 'vitest'
import { ColorPanel, ColorPanelSkeleton } from '../../../components/color'
import { DensityProvider } from '../../../providers/density'
import { present, renderUI } from '../../helpers'

/**
 * A ColorPanel keeps inside a parent that is narrower than its own width. At
 * the loose step the panel is 352px, so a phone column of about 340px is too
 * narrow for it.
 */

const PARENT = 300

describe('ColorPanel in a narrow parent', () => {
	it.each([
		['ColorPanel', () => <ColorPanel />],
		['ColorPanelSkeleton', () => <ColorPanelSkeleton />],
	] as const)('keeps %s inside the parent at the loose step', (_, render) => {
		const { container } = renderUI(
			<DensityProvider density="loose">
				<div data-testid="parent" style={{ width: PARENT }}>
					{render()}
				</div>
			</DensityProvider>,
		)

		const parent = present(container.querySelector('[data-testid="parent"]'), 'the parent')

		const panel = present(parent.firstElementChild, 'the panel') as HTMLElement

		expect(panel.getBoundingClientRect().width).toBeLessThanOrEqual(PARENT)
	})
})
