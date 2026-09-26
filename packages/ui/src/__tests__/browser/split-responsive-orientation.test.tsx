import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Split } from '../../components/split'
import { present, renderUI } from '../helpers'

/**
 * A Split with a responsive `orientation` lays out on one axis at each breakpoint.
 *
 * Each breakpoint sets the template of its own axis. Without a reset, the template of the
 * old axis stayed in force from the smaller breakpoint. A split that stacks at the base and
 * goes horizontal at `sm` kept its two rows, so the panes sat in the first row over an empty
 * second row. A split that goes the other way kept its two columns and never stacked.
 *
 * Rides the real browser because the claim is a computed layout: jsdom loads no stylesheet.
 */
describe('a Split with a responsive orientation (real browser)', () => {
	beforeAll(() => page.viewport(960, 640))

	function panes(container: HTMLElement) {
		const split = present(container.querySelector('[data-slot="split"]'), 'split')

		const [first, second] = Array.from(split.children, (child) => child.getBoundingClientRect())

		return { split: split.getBoundingClientRect(), first, second }
	}

	it('lays the panes side by side with no empty row once it turns horizontal', () => {
		const { container } = renderUI(
			<Split orientation={{ initial: 'vertical', sm: 'horizontal' }} gap="md">
				<div style={{ height: 40 }}>a</div>
				<div style={{ height: 40 }}>b</div>
			</Split>,
		)

		const { split, first, second } = panes(container)

		expect(second?.top).toBe(first?.top)

		expect(split.height).toBe(40)
	})

	it('stacks the panes once it turns vertical', () => {
		const { container } = renderUI(
			<Split orientation={{ initial: 'horizontal', sm: 'vertical' }} gap="md">
				<div style={{ height: 40 }}>a</div>
				<div style={{ height: 40 }}>b</div>
			</Split>,
		)

		const { split, first, second } = panes(container)

		expect(second?.left).toBe(first?.left)

		expect(second?.width).toBe(split.width)
	})
})
