import { describe, expect, it } from 'vitest'
import { Collapse, CollapsePanel, CollapseTrigger } from '../../components/collapse'
import { renderUI, screen } from '../helpers'

/**
 * A Collapse in the panel of another Collapse keeps its own look. The color of
 * its trigger comes from its own state, not from the state of the outer Collapse.
 *
 * Runs in the real browser, because jsdom loads no stylesheet and cannot compute
 * a color.
 */
describe('a nested Collapse (real browser)', () => {
	function Nested({ inner }: { inner: boolean }) {
		return (
			<>
				<Collapse defaultOpen>
					<CollapseTrigger>Outer</CollapseTrigger>
					<CollapsePanel>
						<Collapse defaultOpen={inner}>
							<CollapseTrigger>Inner</CollapseTrigger>
							<CollapsePanel>Inner panel</CollapsePanel>
						</Collapse>
					</CollapsePanel>
				</Collapse>

				<Collapse>
					<CollapseTrigger>Closed</CollapseTrigger>
					<CollapsePanel>Closed panel</CollapsePanel>
				</Collapse>
			</>
		)
	}

	/** The text color of a trigger. */
	const color = (name: string) => getComputedStyle(screen.getByRole('button', { name })).color

	it('gives a closed inner trigger the color of a closed trigger', () => {
		renderUI(<Nested inner={false} />)

		expect(color('Inner')).toBe(color('Closed'))

		// The open trigger keeps the open color, so the match above is not a match of two defaults.
		expect(color('Outer')).not.toBe(color('Closed'))
	})

	it('gives an open inner trigger the color of an open trigger', () => {
		renderUI(<Nested inner />)

		expect(color('Inner')).toBe(color('Outer'))
	})
})
