import { describe, expect, it } from 'vitest'
import { TouchTarget } from '../../primitives'
import { renderUI, screen } from '../helpers'

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
})
