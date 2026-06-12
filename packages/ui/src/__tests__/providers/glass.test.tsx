import { describe, expect, it } from 'vitest'
import { GlassProvider, useGlass } from '../../providers/glass'
import { bySlot, renderUI } from '../helpers'

function GlassProbe() {
	return <output>{String(useGlass())}</output>
}

describe('GlassProvider', () => {
	it('renders with data-slot="glass"', () => {
		const { container } = renderUI(<GlassProvider>content</GlassProvider>)

		const el = bySlot(container, 'glass')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('SPAN')
	})

	it('provides glass to descendants, suspended by enabled={false}', () => {
		const { container, rerender } = renderUI(
			<GlassProvider>
				<GlassProbe />
			</GlassProvider>,
		)

		expect(container.querySelector('output')).toHaveTextContent('true')

		rerender(
			<GlassProvider enabled={false}>
				<GlassProbe />
			</GlassProvider>,
		)

		expect(container.querySelector('output')).toHaveTextContent('false')

		expect(bySlot(container, 'glass')).not.toBeInTheDocument()
	})
})
