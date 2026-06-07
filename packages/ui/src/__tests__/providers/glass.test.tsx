import { describe, expect, it } from 'vitest'
import { GlassProvider } from '../../providers/glass'
import { bySlot, renderUI } from '../helpers'

describe('GlassProvider', () => {
	it('renders with data-slot="glass"', () => {
		const { container } = renderUI(<GlassProvider>content</GlassProvider>)

		const el = bySlot(container, 'glass')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('SPAN')
	})
})
