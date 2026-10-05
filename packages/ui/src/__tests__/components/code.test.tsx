import { describe, expect, it } from 'vitest'
import { Code } from '../../components/code'
import { Portal } from '../../primitives/portal'
import { bySlot, renderUI, screen } from '../helpers'

describe('Code', () => {
	it('renders with data-slot="code"', () => {
		const { container } = renderUI(<Code>const x = 1</Code>)

		const el = bySlot(container, 'code')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('CODE')
	})

	it('opens the density context when it has a size', () => {
		// The portal host writes the step of the nearest context scope. The
		// attribute alone opens no context, so the host then writes no step.
		renderUI(
			<Code size="lg">
				<Portal open>
					<span>Panel</span>
				</Portal>
			</Code>,
		)

		expect(screen.getByText('Panel').closest('[data-slot="portal"]')).toHaveAttribute(
			'data-density',
			'lg',
		)
	})
})
