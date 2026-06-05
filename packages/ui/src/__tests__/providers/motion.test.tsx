import { describe, expect, it } from 'vitest'
import { Motion } from '../../providers/motion'
import { renderUI, screen } from '../helpers'

describe('Motion', () => {
	it('renders its children', () => {
		renderUI(
			<Motion>
				<span>child</span>
			</Motion>,
		)

		expect(screen.getByText('child')).toBeInTheDocument()
	})

	it('renders with an explicit reducedMotion prop', () => {
		renderUI(
			<Motion reducedMotion="always">
				<span>always</span>
			</Motion>,
		)

		expect(screen.getByText('always')).toBeInTheDocument()
	})
})
