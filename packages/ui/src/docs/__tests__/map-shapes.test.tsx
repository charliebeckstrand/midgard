import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Shapes from '../pages/modules/map/point/shapes.tsx'

// A summary is a circle, and a depot that merges with its stops into a summary
// draws no square. The Shapes example must show the shape that it names.

describe('the Shapes example of Map', () => {
	it('draws the square of a depot apart from its stops', () => {
		const { container } = render(<Shapes />)

		expect(container.querySelectorAll('path[stroke-linecap="square"]')).not.toHaveLength(0)
	})
})
