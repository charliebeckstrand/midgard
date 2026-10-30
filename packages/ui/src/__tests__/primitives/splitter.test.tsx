import { describe, expect, it } from 'vitest'
import { Splitter } from '../../primitives/splitter/splitter'
import { renderUI, screen } from '../helpers'

describe('Splitter', () => {
	it('gives its range and its value to the separator', () => {
		renderUI(<Splitter label="Resize" orientation="vertical" value={40} min={10} max={80} />)

		const splitter = screen.getByRole('separator', { name: 'Resize' })

		expect(splitter).toHaveAttribute('aria-valuenow', '40')

		expect(splitter).toHaveAttribute('aria-valuemin', '10')

		expect(splitter).toHaveAttribute('aria-valuemax', '80')
	})

	// Without a maximum, the ARIA default of 100 applies, and a width of 320
	// pixels is out of the range of the separator.
	it('keeps a value with no maximum in its range', () => {
		renderUI(
			<Splitter label="Resize" orientation="vertical" value={320} min={40} valueText="320 px" />,
		)

		const splitter = screen.getByRole('separator', { name: 'Resize' })

		expect(Number(splitter.getAttribute('aria-valuemax'))).toBeGreaterThanOrEqual(320)

		expect(splitter).toHaveAttribute('aria-valuetext', '320 px')
	})
})
