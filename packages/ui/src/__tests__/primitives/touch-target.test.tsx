import { describe, expect, it, vi } from 'vitest'
import { TouchTarget } from '../../primitives/touch-target'
import { fireEvent, renderUI, screen } from '../helpers'

describe('TouchTarget', () => {
	it('renders its children', () => {
		renderUI(
			<TouchTarget>
				<span>Click me</span>
			</TouchTarget>,
		)

		expect(screen.getByText('Click me')).toBeInTheDocument()
	})

	it('renders an invisible touch area with aria-hidden', () => {
		const { container } = renderUI(
			<TouchTarget>
				<span>Target</span>
			</TouchTarget>,
		)

		const touchArea = container.querySelector('[aria-hidden="true"]')

		expect(touchArea).toBeInTheDocument()

		expect(touchArea?.tagName).toBe('SPAN')
	})

	it('keeps the expansion area interactive so it can capture taps', () => {
		const { container } = renderUI(
			<TouchTarget>
				<span>Target</span>
			</TouchTarget>,
		)

		const touchArea = container.querySelector('[aria-hidden="true"]')

		expect(touchArea?.className).toContain('pointer-events-auto')
	})

	it('forwards a tap on the expansion area to the interactive host', () => {
		const onClick = vi.fn()

		const { container } = renderUI(
			<button type="button" onClick={onClick}>
				<TouchTarget>
					<span>Target</span>
				</TouchTarget>
			</button>,
		)

		const touchArea = container.querySelector('[aria-hidden="true"]') as HTMLElement

		fireEvent.click(touchArea)

		expect(onClick).toHaveBeenCalled()
	})
})
